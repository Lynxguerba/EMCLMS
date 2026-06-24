import {
  X,
  BookOpen,
  AlertCircle,
  Save,
  Trash2,
  Library,
  Edit,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  useBookshelves,
  useCreateBookshelf,
  useUpdateBookshelf,
  useDeleteBookshelf,
} from "../../hooks/useQueries";

interface LibrarianManageBookshelvesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LibrarianManageBookshelvesModal({
  open,
  onClose,
}: LibrarianManageBookshelvesModalProps) {
  const [bookshelfName, setBookshelfName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const { data: bookshelves = [], isLoading: loading } = useBookshelves();
  const createMutation = useCreateBookshelf();
  const updateMutation = useUpdateBookshelf();
  const deleteMutation = useDeleteBookshelf();

  useEffect(() => {
    if (open) {
      setBookshelfName("");
      setEditingId(null);
    }
  }, [open]);

  const isValid = () => bookshelfName.trim() !== "";

  const handleSubmit = async () => {
    if (!isValid()) return;

    createMutation.mutate(
      { name: bookshelfName },
      {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: "Bookshelf created successfully!",
            severity: "success",
          });
          setBookshelfName("");
        },
        onError: (err: any) => {
          console.error("Error creating bookshelf", err);
          setSnackbar({
            open: true,
            message: err?.response?.data?.detail || "Failed to create bookshelf",
            severity: "error",
          });
        },
      }
    );
  };

  const handleUpdate = async (id: number) => {
    if (editingName.trim() === "") return;

    updateMutation.mutate(
      { id, name: editingName },
      {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: "Bookshelf updated successfully!",
            severity: "success",
          });
          setEditingId(null);
        },
        onError: (err: any) => {
          console.error("Error updating bookshelf", err);
          setSnackbar({
            open: true,
            message: err?.response?.data?.detail || "Failed to update bookshelf",
            severity: "error",
          });
        },
      }
    );
  };

  const handleDelete = async (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: "Bookshelf deleted successfully!",
          severity: "success",
        });
      },
      onError: (err: any) => {
        console.error("Error deleting bookshelf", err);
        setSnackbar({
          open: true,
          message: err?.response?.data?.detail || "Failed to delete bookshelf",
          severity: "error",
        });
      },
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Library className="w-5 h-5 text-gray-800" />
              <h2 className="text-lg font-bold text-gray-800">Manage Bookshelves</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Info message */}
            <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Create and manage bookshelves to organize your library catalog.
              </p>
            </div>

            {/* Add New Bookshelf Section */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Bookshelf Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={bookshelfName}
                  onChange={(e) => setBookshelfName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && isValid()) {
                      handleSubmit();
                    }
                  }}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter bookshelf name"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid() || createMutation.isPending}
              className="w-full mb-6 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {createMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Add Bookshelf
            </button>

            {/* Divider */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500 font-medium">Existing Bookshelves</span>
              </div>
            </div>

            {/* Existing Bookshelves List */}
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : bookshelves.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No bookshelves found.</p>
                <p className="text-xs text-gray-400 mt-1">Create your first bookshelf above.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {bookshelves.map((bs) => (
                  <div
                    key={bs.bookshelf_id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                      <BookOpen className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      {editingId === bs.bookshelf_id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleUpdate(bs.bookshelf_id)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleUpdate(bs.bookshelf_id);
                            }
                          }}
                          autoFocus
                          className="w-full px-2 py-1 text-sm border border-blue-500 rounded outline-none"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {bs.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingId === bs.bookshelf_id ? (
                        <button
                          onClick={() => handleUpdate(bs.bookshelf_id)}
                          disabled={updateMutation.isPending}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                          title="Save"
                        >
                          {updateMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(bs.bookshelf_id);
                            setEditingName(bs.name);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit bookshelf"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(bs.bookshelf_id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === bs.bookshelf_id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete bookshelf"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === bs.bookshelf_id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar?.open && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-in slide-in-from-top duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              snackbar.severity === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{snackbar.message}</p>
            <button
              onClick={() => setSnackbar(null)}
              className="ml-2 hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}