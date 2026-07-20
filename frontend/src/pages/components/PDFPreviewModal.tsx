import { X, FileText, Download, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { forceDownload } from "../../utils/fileUtils";
import { useEffect, useState } from "react";

interface PDFPreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export default function PDFPreviewModal({
  open,
  onClose,
  fileUrl,
  title,
}: PDFPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fileUrl) {
      setLoading(true);
      setError(null);
      setBlobUrl(null);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const isInternal = 
        fileUrl.startsWith("/") || 
        (baseUrl && fileUrl.startsWith(baseUrl)) ||
        fileUrl.includes("localhost:8000") || 
        fileUrl.includes("127.0.0.1:8000");

      if (isInternal) {
        // Use credentials only for internal URLs to avoid CORS issues
        // Append a timestamp to prevent caching of 401 responses
        const urlWithCacheBust = `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
        
        fetch(urlWithCacheBust, { credentials: "include" })
          .then(async (res) => {
            if (!res.ok) throw new Error(`Failed to load PDF: ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Internal fetch failed:", err);
            setError("Failed to load PDF preview. You can try opening it in a new tab.");
            setLoading(false);
          });
      } else {
        // External URL (Google Drive, Cloudinary, etc.) - let iframe handle it directly
        // Just set loading to false, we'll use fileUrl in the iframe
        setLoading(false);
      }
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [open, fileUrl]);

  if (!open) return null;

  const fileName = fileUrl.split("/").pop() || "document.pdf";

  // Use blobUrl if available (internal fetch), otherwise use original fileUrl (external)
  const displayUrl = blobUrl || fileUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 line-clamp-1">
                Preview: {title}
              </h2>
              <p className="text-xs text-gray-500">{fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => forceDownload(fileUrl, fileName)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Download PDF"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={() => window.open(fileUrl, "_blank")}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="hidden sm:inline">External</span>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100 relative flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-600">Loading document...</p>
            </div>
          )}
          
          {error && (
            <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Preview Failed</h3>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
              <button
                onClick={() => window.open(fileUrl, "_blank")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Document in New Tab
              </button>
            </div>
          )}

          {!loading && !error && (
            <iframe
              src={`${displayUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-200 font-medium shadow-sm active:scale-95"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
