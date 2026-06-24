import React from "react";
import { Loader2 } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - covers entire screen */}
      <div
        className={`fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm transition-opacity ${
          isLoading ? "opacity-75 pointer-events-none" : "opacity-100"
        }`}
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal - positioned independently at screen center */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-[calc(100%-2rem)] mx-auto overflow-hidden pointer-events-auto">
          <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 to-slate-100">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              Confirm Logout
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200/60">
            <p className="text-sm sm:text-base text-slate-600">
              {isLoading
                ? "Logging out of your account..."
                : "Are you sure you want to log out of your account?"}
            </p>
          </div>
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-slate-100 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-200/60">
            <button
              onClick={onClose}
              disabled={isLoading}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-medium hover:shadow-md order-2 sm:order-1 ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-bold shadow-md hover:shadow-lg order-1 sm:order-2 flex items-center justify-center gap-2 ${
                isLoading ? "opacity-80 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                "Logout"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutModal;
