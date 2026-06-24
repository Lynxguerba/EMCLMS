import React from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";

interface ContentDeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}

const ContentDeleteConfirmationModal: React.FC<ContentDeleteConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-red-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-600 hover:bg-red-100 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning message */}
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">
                Warning: This action cannot be undone
              </p>
              <p className="text-sm text-red-800">
                {description}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Are you absolutely sure you want to proceed with this deletion? This will permanently remove the content from the system.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="group relative overflow-hidden px-5 py-2 bg-red-600 text-white rounded-lg
             hover:bg-red-700 transition-all duration-200 font-medium shadow-sm
             hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
             flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Shine effect */}
            <span
              className="pointer-events-none absolute inset-0 z-0
               bg-gradient-to-r from-transparent via-white/30 to-transparent
               translate-x-[-100%] group-hover:translate-x-[100%]
               transition-transform duration-1000"
            />

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirm Delete
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentDeleteConfirmationModal;