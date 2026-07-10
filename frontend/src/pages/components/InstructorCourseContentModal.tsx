import { format } from "date-fns";
import {
  X,
  FileText,
  Calendar,
  Tag,
  Download,
  ExternalLink,
} from "lucide-react";
import { InstructorCourse_Content as Content } from "../../types/content";
import {
  getRemoteFileName,
  openDirectFile,
} from "../../utils/fileUtils";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedContent: Content | null;
};

export default function InstructorCourseContentModal({
  open,
  onClose,
  selectedContent,
}: Props) {
  if (!open || !selectedContent) return null;

  const getContentTypeColor = (type?: string) => {
    switch (type) {
      case "Activity":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "File":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Video":
        return "bg-red-100 text-red-800 border-red-300";
      case "Quiz":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case "Activity":
      case "File":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const hasFiles =
    (selectedContent.content_type === "Activity" ||
      selectedContent.content_type === "File") &&
    selectedContent.files &&
    selectedContent.files.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-indigo-500 rounded-lg p-2 flex-shrink-0">
              {getContentTypeIcon(selectedContent.content_type)}
            </div>
            <h2 className="text-lg font-bold text-gray-800 break-words">
              {selectedContent.content_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-4">
            {/* Content Type Badge */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getContentTypeColor(
                  selectedContent.content_type
                )}`}
              >
                {selectedContent.content_type}
              </span>
            </div>

            {/* Description */}
            {selectedContent.content_description && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {selectedContent.content_description}
                </p>
              </div>
            )}

            {/* Due Date */}
            {selectedContent.due_date && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Calendar className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-0.5">
                    Due Date
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    {format(new Date(selectedContent.due_date), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}

          
            {/* Files Section */}
            {selectedContent.files && selectedContent.files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-gray-800">
                    Attached Files ({selectedContent.files.length})
                  </h3>
                </div>

                <div className="space-y-2">
                  {selectedContent.files?.map((file: any, index: number) => {
                    const fileName = getRemoteFileName(file);

                    return (
                      <button
                        key={index}
                        onClick={() => openDirectFile(file, "open")}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 group"
                      >
                        <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileName}
                          </p>
                          <p className="text-xs text-gray-500">Click to open</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Files Message */}
            {!hasFiles && !selectedContent.content_description && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No additional content available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Close
          </button>
        </div> */}
      </div>
    </div>
  );
}
