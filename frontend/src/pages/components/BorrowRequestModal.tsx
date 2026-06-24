import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    Library,
    ShieldCheck,
    User,
    X,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { useSubmitBorrowRequest } from "../../hooks/useQueries";

interface BorrowRequestModalProps {
    open: boolean;
    onClose: () => void;
    book: {
        id: number;
        title: string;
        author: string;
        publisher: string;
        copyright: number;
        isbn: string;
        copy: number;
        bookshelf__name: string;
    } | null;
    isPending?: boolean;
}

const BorrowRequestModal: React.FC<BorrowRequestModalProps> = ({
    open,
    onClose,
    book,
    isPending = false,
}) => {
    const [success, setSuccess] = useState(false);
    const [reason, setReason] = useState("");

    const submitMutation = useSubmitBorrowRequest();

    if (!open || !book) return null;

    const handleSubmit = async () => {
        submitMutation.mutate(
            { book_id: book.id, reason },
            {
                onSuccess: () => {
                    setSuccess(true);
                    setTimeout(() => {
                        setSuccess(false);
                        onClose();
                        setReason(""); // Reset reason
                    }, 2000);
                },
            }
        );
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Borrow Request
                            </h2>
                            <p className="text-xs text-gray-500">
                                Review the details before sending your request.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitMutation.isPending}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-1.5 transition-all duration-200 hover:rotate-90 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-160px)]">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900">Request Sent!</h3>
                                <p className="text-gray-500 mt-1">Your request is being processed.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {submitMutation.isError && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{(submitMutation.error as any).response?.data?.error || "Failed to submit borrow request."}</p>
                                </div>
                            )}

                            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                                    {book.title}
                                </h3>
                                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                    <span className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        {book.author}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Library className="w-4 h-4" />
                                        {book.publisher}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {book.copyright}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        ISBN {book.isbn}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">
                                    Reason for Borrowing
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter your reason here (e.g., Thesis research, Course requirement...)"
                                    className="w-full min-h-[100px] p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm text-gray-700 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-gray-200 p-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Request Status
                                    </p>
                                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            Auto-hold for 48 hours once approved
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            Typical approval time: 1-2 days
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Library className="w-4 h-4 text-indigo-600" />
                                            Bookshelf: {book.bookshelf__name}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-200 p-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Borrow Details
                                    </p>
                                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-blue-600" />
                                            Available copies: {book.copy}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-emerald-600" />
                                            Loan duration: 7 days
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                                            2 renewals allowed
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                {isPending ? (
                                    <div className="flex items-center gap-2 font-semibold text-amber-600">
                                        <Clock className="w-4 h-4" />
                                        You already have a pending request for this book.
                                    </div>
                                ) : book.copy > 0 ? (
                                    "Keep your student ID ready. The librarian will verify your identity when the request is approved."
                                ) : (
                                    <div className="flex items-center gap-2 font-semibold text-red-600">
                                        <AlertCircle className="w-4 h-4" />
                                        Currently unavailable. All copies are either borrowed or on hold.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {!success && (
                    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={submitMutation.isPending}
                            className="w-full sm:w-auto px-5 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitMutation.isPending || book.copy <= 0 || isPending}
                            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-blue-200/60 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                "Send Borrow Request"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default BorrowRequestModal;
