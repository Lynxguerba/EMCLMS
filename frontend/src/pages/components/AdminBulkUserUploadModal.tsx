import React, { useState, useRef } from "react";
import { X, Upload, FileDown, AlertCircle, Info, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useBulkCreateUser } from "../../hooks/useQueries";

interface AdminBulkUserUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminBulkUserUploadModal: React.FC<AdminBulkUserUploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    created_count: number;
    error_count: number;
    errors: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: bulkCreate } = useBulkCreateUser();

  if (!open) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  };

  const parseManualInput = (input: string): any[] => {
    const lines = input.trim().split("\n");
    if (lines.length === 0) return [];

    const firstLine = lines[0].split(",").map(h => h.trim().toLowerCase());
    // Detect if first line is headers
    const hasHeaders = firstLine.some(h => ["email", "user_type", "first_name", "last_name", "program"].includes(h));
    
    let headers: string[] = [];
    let startLine = 0;

    if (hasHeaders) {
      headers = firstLine;
      startLine = 1;
    } else {
      // Default order if no headers detected - but warn the user through the error system later
      headers = ["first_name", "last_name", "email", "user_type", "program", "password"];
      startLine = 0;
    }

    const data = [];
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(",").map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          obj[header] = values[index];
        }
      });
      data.push(obj);
    }
    return data;
  };

  const handleStartImport = async () => {
    setLoading(true);
    setResults(null);
    setError(null);

    let usersToUpload: any[] = [];

    try {
      if (file) {
        usersToUpload = await parseFile(file);
      } else if (manualInput.trim()) {
        usersToUpload = parseManualInput(manualInput);
        
        // Final sanity check for manual input headers
        const firstEntry = usersToUpload[0];
        if (firstEntry && !firstEntry.email && !firstEntry.user_type) {
           setError("Headers missing or incorrect. Please ensure the first row contains 'email' and 'user_type' columns.");
           setLoading(false);
           return;
        }
      } else {
        setError("Please select a file or enter data manually.");
        setLoading(false);
        return;
      }

      if (usersToUpload.length === 0) {
        setError("No valid user data found.");
        setLoading(false);
        return;
      }

      const response = await bulkCreate({ users: usersToUpload });
      setResults(response);
      setFile(null);
      setManualInput("");
      if (response.created_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Import error:", err);
      if (err.response?.data?.errors) {
        setResults(err.response.data);
      } else {
        setError(err.response?.data?.detail || "An error occurred during import.");
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [["first_name", "last_name", "email", "user_type", "program", "password"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "bulk_user_import_template.xlsx");
  };

  const resetState = () => {
    setFile(null);
    setManualInput("");
    setResults(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 leading-tight">
                Bulk User Upload
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Import multiple accounts at once
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetState(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {results ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="text-sm font-bold text-green-900">Import Complete</h3>
                  <p className="text-xs text-green-700">
                    Successfully created {results.created_count} users. {results.error_count} errors.
                  </p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-tight">Errors</h4>
                  <div className="max-h-48 overflow-y-auto border border-red-100 rounded-xl divide-y divide-red-50">
                    {results.errors.map((err, idx) => (
                      <div key={idx} className="p-3 bg-red-50/30 flex items-start gap-3">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-red-900">{err.email || "Row " + (err.index + 2)}:</span>{" "}
                          <span className="text-red-700">{err.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setResults(null)}
                className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition-all"
              >
                Upload More
              </button>
            </div>
          ) : (
            <>
              {/* Instructions section */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                <div className="flex gap-4">
                  <div className="bg-blue-100 p-2 rounded-full h-fit mt-0.5">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-blue-900 mb-1">Getting Started</h3>
                      <p className="text-xs text-blue-700/80 leading-relaxed">
                        Download our official CSV template to ensure your data is formatted correctly. 
                        Required columns: <span className="font-mono bg-blue-100/50 px-1 rounded">first_name, last_name, email, user_type, program, password</span>.
                      </p>
                      <p className="text-[10px] text-blue-600/70 mt-1 font-medium">
                        Note: Only Superadmins can create other Superadmin or Administrator accounts.
                      </p>
                    </div>
                    <button 
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-[11px] font-bold rounded-lg hover:bg-blue-50 transition-all shadow-sm"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/30 scale-[0.99]"
                    : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50"
                }`}
              >
                <div className={`p-4 rounded-2xl mb-4 transition-colors duration-300 ${dragActive || file ? 'bg-blue-100 shadow-sm' : 'bg-gray-50'}`}>
                  <Upload className={`w-10 h-10 ${dragActive || file ? "text-blue-600" : "text-gray-300"}`} />
                </div>
                <div className="text-center space-y-1">
                  {file ? (
                    <p className="text-sm font-bold text-blue-600">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-700">
                        Drag and drop your file here
                      </p>
                      <p className="text-xs text-gray-500">
                        or <span className="text-blue-600 font-bold transition-all">browse files</span>
                      </p>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-6 font-medium uppercase tracking-wider">
                  Supports CSV, XLS, XLSX (Max 10MB)
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                  accept=".csv,.xls,.xlsx" 
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-100"></span>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="bg-white px-4 text-gray-400">Alternative Method</span>
                </div>
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                    Manual CSV Input (Headers Required)
                  </label>
                  <button 
                    onClick={() => setManualInput("first_name, last_name, email, user_type, program, password\n" + manualInput)}
                    className="text-[10px] text-blue-600 font-bold hover:underline bg-blue-50 px-2 py-1 rounded"
                  >
                    + Add Header Row
                  </button>
                </div>
                <textarea
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    if (e.target.value.trim()) setFile(null);
                  }}
                  placeholder="first_name, last_name, email, user_type, program, password"
                  rows={4}
                  className="w-full p-4 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono bg-gray-50/30 placeholder:text-gray-400"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Info Banner */}
              {!results && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Note: Login credentials will be automatically generated if not provided and dispatched to each recipient's email upon successful processing.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!results && (
          <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              onClick={() => { resetState(); onClose(); }}
              className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            
            <button
              onClick={handleStartImport}
              disabled={loading || (!file && !manualInput.trim())}
              className="relative group overflow-hidden px-8 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl 
               shadow-lg shadow-blue-200 hover:shadow-xl hover:bg-blue-700 
               disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
               transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* SHINE ANIMATION LAYER */}
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              
              <span className="relative flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Import
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBulkUserUploadModal;
