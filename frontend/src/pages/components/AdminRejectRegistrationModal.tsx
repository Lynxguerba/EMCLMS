import { X, AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { RegistrationRequest } from "../../types/user";
import { useRejectRegistration } from "../../hooks/useQueries";

export default function AdminRejectRegistrationModal({
  open,
  onClose,
  request,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  request: RegistrationRequest | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const rejectMutation = useRejectRegistration();

  const handleReject = async () => {
    if (!request) return;

    setLoading(true);

    try {
      await rejectMutation.mutateAsync(request.id);
      onSuccess();
      onClose();
    } catch (error: any) {
      onError(error.response?.data?.detail || error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-800">Reject Request</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">
                Reject Registration Request
              </p>
              <p className="text-xs text-red-800">
                Are you sure you want to reject the registration request for{" "}
                <strong>{request.email}</strong>? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">
              <span className="font-semibold">Email:</span>
            </p>
            <p className="text-sm font-medium text-gray-900">{request.email}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">
              <span className="font-semibold">Request Date:</span>
            </p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(request.requested_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
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
                  Rejecting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Reject Request
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
