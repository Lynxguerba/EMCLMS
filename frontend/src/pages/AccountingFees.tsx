import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { 
  Box, 
  IconButton,
  TextField,
  InputAdornment,
  Snackbar,
  Alert
} from "@mui/material";
import { 
  Settings, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Tag, 
  Sparkles,
  AlertCircle,
  X
} from "lucide-react";
import axios from "axios";



const COLORS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-purple-400 to-fuchsia-500",
  "from-cyan-400 to-blue-500"
];

export default function AccountingFees() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // State
  const [fees, setFees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [feeToDelete, setFeeToDelete] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    amount: "0.00",
    status: "Active"
  });

  // Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  // Data Fetching
  const fetchFees = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/`, { withCredentials: true });
      setFees(res.data);
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to fetch fees from server", severity: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  // Filter Logic
  const filteredFees = useMemo(() => {
    return fees.filter((fee: any) => 
      fee.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fees, searchQuery]);

  // CRUD Operations
  const handleOpenAddModal = () => {
    setEditingFee(null);
    setFormData({ name: "", amount: "₱0.00", status: "Active" });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (fee: any) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      amount: fee.amount,
      status: fee.status
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (fee: any) => {
    setFeeToDelete(fee);
    setIsDeleteModalOpen(true);
  };

  const handleSaveFee = async () => {
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: "Fee name is required", severity: "error" });
      return;
    }

    try {
      if (editingFee) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/${editingFee.id}/`,
          formData,
          { withCredentials: true }
        );
        setSnackbar({ open: true, message: "Fee updated successfully", severity: "success" });
      } else {
        const payload = {
          ...formData,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]
        };
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/`,
          payload,
          { withCredentials: true }
        );
        setSnackbar({ open: true, message: "New fee created", severity: "success" });
      }
      setIsModalOpen(false);
      fetchFees();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.detail || "Operation failed", severity: "error" });
    }
  };

  const handleDeleteFee = async () => {
    if (feeToDelete) {
      try {
        await axios.delete(
          `${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/${feeToDelete.id}/`,
          { withCredentials: true }
        );
        setSnackbar({ open: true, message: "Fee deleted permanently", severity: "success" });
        setIsDeleteModalOpen(false);
        setFeeToDelete(null);
        fetchFees();
      } catch (err: any) {
        setSnackbar({ open: true, message: "Failed to delete fee", severity: "error" });
      }
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Sidebar userRole="accounting" currentPath={currentPath} open={isSidebarOpen} onClose={handleSidebarToggle} />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <main className="md:ml-52 pt-24 pb-12 px-4 sm:px-8 space-y-12">
        {/* Data-Driven Header Section */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
          <div className="md:col-span-2 flex flex-col justify-center bg-gradient-to-r from-[#0a1a3b] to-[#1e293b] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-blue-100/80 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md">
                    <Sparkles className="w-3 h-3" /> Institutional Fees
                  </div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tight">
                    Fee Management
                  </h1>
               </div>
               <button 
                 onClick={handleOpenAddModal}
                 className="flex items-center gap-2 px-6 py-3 bg-white text-[#0a1a3b] rounded-2xl shadow-xl hover:shadow-white/20 transition-all font-black uppercase tracking-wide text-xs active:scale-95 group-hover:scale-[1.02] shrink-0"
               >
                 <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                 New Fee
               </button>
            </div>
          </div>

          {/* Quick Stats: Active Rates */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden">
             <div className="absolute right-4 top-4 opacity-5">
               <Tag className="w-16 h-16" />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Rates</p>
             <p className="text-3xl font-black text-[#0a1a3b]">{fees.filter(f => f.status === 'Active').length}</p>
             <p className="text-[10px] font-bold text-emerald-500 mt-2 tracking-widest uppercase">Available to Charge</p>
          </div>

          {/* Quick Stats: Inactive Rates */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden">
             <div className="absolute right-4 top-4 opacity-5">
               <Settings className="w-16 h-16" />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inactive Fees</p>
             <p className="text-3xl font-black text-[#0a1a3b] tracking-tighter">
               {fees.filter(f => f.status === 'Inactive').length}
             </p>
             <p className="text-[10px] font-bold text-blue-500 mt-2 tracking-widest uppercase">Archived / Drafts</p>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
          <div className="relative flex-1 max-w-md w-full">
            <TextField
              fullWidth
              placeholder="Search by fee name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-5 h-5 text-slate-400" />
                  </InputAdornment>
                ),
                sx: { 
                  borderRadius: '1.5rem', 
                  bgcolor: 'white', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  '& fieldset': { border: 'none' },
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  px: 1
                }
              }}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-200/50 rounded-xl text-slate-600 text-[10px] font-black uppercase tracking-widest">
              Total Fees: {filteredFees.length}
            </div>
            <IconButton className="bg-white shadow-md border border-slate-100" onClick={() => setSearchQuery("")}>
               <Settings className="w-5 h-5 text-slate-600" />
            </IconButton>
          </div>
        </div>

        {/* Fees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            // Skeleton Loading State
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-[2.5rem] p-8 h-64 animate-pulse border border-slate-100 shadow-sm" />
            ))
          ) : filteredFees.length > 0 ? (
            filteredFees.map((fee: any, index: number) => (
              <div 
                key={fee.id}
                className="group relative bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300 transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-bottom-5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${fee.color} opacity-[0.03] group-hover:opacity-10 rounded-bl-[100px] transition-opacity`} />
                
                <div className="relative flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${fee.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                      <Tag className="w-12 h-12 p-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenEditModal(fee)}
                        className="bg-slate-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDeleteModal(fee)}
                        className="bg-slate-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      {fee.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${fee.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${fee.status === 'Active' ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {fee.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-slate-50 pt-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Rate</p>
                      <p className="text-2xl font-black text-[#0a1a3b]">₱{Number(fee.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-400 font-bold">No fees defined yet. Create your first fee to get started.</p>
            </div>
          )}

          {/* Add Placeholder Card */}
          <button 
            onClick={handleOpenAddModal}
            className="group relative rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
          >
            <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <Plus className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-slate-500 group-hover:text-blue-600 uppercase tracking-widest">Register New Fee</p>
              <p className="text-[10px] text-slate-400 font-medium">Add a standard institutional rate</p>
            </div>
          </button>
        </div>
      </main>

      {/* Add / Edit Fee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  {editingFee ? "Edit Fee Configuration" : "Create New Fee"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fee Label</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Development Fee"
                  className="block w-full px-5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Current Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="block w-full px-5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Standard Rate</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                    <input
                      type="text"
                      value={formData.amount.replace('₱', '')}
                      onChange={(e) => setFormData({ ...formData, amount: `₱${e.target.value}` })}
                      placeholder="0.00"
                      className="block w-full pl-10 pr-5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-gray-200">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFee}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
              >
                Save Fee Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Fee?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to remove <span className="font-bold text-gray-800">{feeToDelete?.name}</span>? This action is permanent.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
              >
                Keep it
              </button>
              <button
                onClick={handleDeleteFee}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all shadow-md shadow-red-200"
              >
                Delete Fee
              </button>
            </div>
          </div>
        </div>
      )}

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: '0.75rem', fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>{`
        .animate-in {
          animation: enter 0.2s ease-out forwards;
        }
        @keyframes enter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
