import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { 
  Box, 
  Avatar, 
  Tooltip,
  Typography
} from "@mui/material";
import { 
  ArrowLeft, 
  PlusCircle, 
  Search, 
  Download,
  CreditCard,
  History,
  Info,
  XCircle,
  FileText,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Link as LinkIcon,
  Tag,
  Calendar
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import AccountingTransactionModal from "./components/AccountingTransactionModal";
import CustomSelect from "../components/CustomSelect";

export default function AccountingStudentLedger() {
  const { student_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const [student, setStudent] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [availableCategories, setAvailableCategories] = useState<string[]>(["All"]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = async () => {
    if (!student_id) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (typeFilter !== "All") params.append("type", typeFilter);
      if (categoryFilter !== "All") params.append("category", categoryFilter);

      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/accounting/students/${student_id}/ledger/?${params.toString()}`, 
        { withCredentials: true }
      );
      setStudent({
        ...res.data.student,
        balance: res.data.balance
      });
      setTransactions(res.data.ledger || []);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [student_id, debouncedSearch, typeFilter, categoryFilter]);

  // Fetch categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/`, { withCredentials: true });
        const categories = ["All", ...res.data.map((f: any) => f.name)];
        setAvailableCategories(categories);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  const handleVoid = async (txId: number) => {
    const reason = window.prompt("Enter reason for voiding this transaction:");
    if (!reason) return;

    try {
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/api/accounting/transactions/${txId}/void/`,
        { reason },
        { withCredentials: true }
      );
      fetchData();
    } catch (err) {
      console.error("Failed to void transaction", err);
      alert("Failed to void transaction. Check console for details.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  return (
    <Box sx={{ height: "100vh", overflowY: "auto", backgroundColor: "#f8fafc" }}>
      <Sidebar userRole="accounting" currentPath={currentPath} open={isSidebarOpen} onClose={handleSidebarToggle} />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-24 md:pt-28 p-4 md:ml-52">
        {/* Back Button and Header */}
        {isLoading || !student ? (
          <div className="h-64 flex items-center justify-center bg-white rounded-[2rem] shadow-sm animate-pulse">
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#94a3b8' }}>LOADING LEDGER DATA...</Typography>
          </div>
        ) : (
        <>
        <div className="mb-8">
          <button 
            onClick={() => navigate('/AccountingStudents')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium font-bold uppercase tracking-wider">Back to Students</span>
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'white', 
                  color: '#3b82f6', 
                  fontSize: '2rem', 
                  fontWeight: '900',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  border: '4px solid white',
                  outline: '2px solid #e2e8f0'
                }}
              >
                {student.name.split(' ').map((n: string) => n[0]).join('')}
              </Avatar>
              <div className="grid gap-1">
                <h1 className="text-3xl font-black text-[#0a1a3b] uppercase tracking-tight">{student.name}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    <FileText className="w-3.5 h-3.5" />
                    {student.program}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 min-w-[260px] relative overflow-hidden group hover:scale-[1.02] transition-transform text-right">
              <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <CreditCard className="w-16 h-16 text-slate-900" />
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                {student.balance > 0 ? 'Total Due Amount' : student.balance < 0 ? 'Advance Balance' : 'Account Settled'}
              </p>
              <p className={`text-4xl font-black tracking-tighter ${
                student.balance > 0 ? 'text-rose-600' : 
                student.balance < 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {student.balance < 0 ? `(${formatCurrency(Math.abs(student.balance))})` : formatCurrency(student.balance)}
              </p>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Action Bar */}
        <div className="mb-6 flex flex-col xl:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 md:w-80 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 w-4 h-4 transition-colors" />
              <input 
                type="text" 
                placeholder="Search description..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm text-sm font-medium"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <CustomSelect 
                value={typeFilter}
                onChange={setTypeFilter}
                options={["All", "Charge", "Payment"]}
                placeholder="All Types"
                className="flex-1 md:w-32"
              />
              <CustomSelect 
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={availableCategories}
                placeholder="All Categories"
                icon={Tag}
                className="flex-1 md:w-56"
              />
              {(debouncedSearch || typeFilter !== "All" || categoryFilter !== "All") && (
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("All");
                    setCategoryFilter("All");
                  }}
                  className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Clear Filters"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all shadow-sm font-black text-xs uppercase tracking-widest">
              <Download className="w-4 h-4 text-blue-600" />
              Export SOA
            </button>
            <button 
              onClick={() => setIsTransactionModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:scale-[1.02] active:scale-95 font-black text-xs uppercase tracking-widest"
            >
              <PlusCircle className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
          <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <History className="w-5 h-5 text-blue-800" />
              </div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Transaction History</h2>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-slate-400 font-black uppercase tracking-widest">
              <Info className="w-3 h-3" />
              Manual verification required for all entries
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest">Transaction Details & Allocations</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-right">Balance</th>
                  <th className="px-6 py-3 text-center text-[10px] font-black uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <Search className="w-10 h-10 text-slate-200" />
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transactions found matching your criteria</p>
                          <button 
                            onClick={() => {
                              setSearchQuery("");
                              setTypeFilter("All");
                              setCategoryFilter("All");
                            }}
                            className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                          >
                            Clear all filters
                          </button>
                       </div>
                    </td>
                  </tr>
                ) : transactions.map((tx) => (
                   <tr key={tx.id} className={`hover:bg-slate-100/50 even:bg-slate-100/30 transition-colors border-b border-slate-200 ${tx.is_voided ? 'opacity-60 bg-white/10' : 'bg-white'} group`}>
                    <td className="px-6 py-4 whitespace-nowrap align-top">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-blue-50 transition-colors">
                          <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="flex flex-col">
                          <div className="text-[14px] font-black text-[#0a1a3b] tracking-tight uppercase">
                            {format(parseISO(tx.created_at), "MMMM dd, yyyy")}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            {format(parseISO(tx.created_at), "EEEE")} • {format(parseISO(tx.created_at), "hh:mm a")}
                          </div>
                          <div className="text-[9px] font-medium text-blue-600/70 uppercase tracking-widest mt-1">
                            {formatDistanceToNow(parseISO(tx.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium leading-relaxed min-w-[300px]">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.1em] ${
                               tx.type === 'Payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                               {tx.type}
                            </span>
                            <div className={`text-xl font-black tracking-tight ${
                               tx.is_voided ? 'text-slate-300 line-through' : (tx.type === 'Charge' ? 'text-rose-600' : 'text-emerald-600')
                            }`}>
                               {formatCurrency(tx.amount)}
                            </div>
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            <Tag className="w-3 h-3" />
                            {tx.category}
                         </div>
                      </div>

                      <div className="text-slate-600 font-medium text-[13px] mb-3 bg-white/50 p-2.5 rounded-xl border border-slate-100 italic">
                        "{tx.description || "No description provided."}"
                      </div>
                      
                       {tx.allocations && tx.allocations.length > 0 && (() => {
                         // Group allocations by category
                         const grouped = tx.allocations.reduce((acc: any, curr: any) => {
                           const key = curr.category;
                           if (!acc[key]) acc[key] = { name: key, amount: 0 };
                           acc[key].amount += curr.amount;
                           return acc;
                         }, {});

                         return (
                          <div className="mt-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
                             <div className="flex items-center gap-1.5 mb-3">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, bgcolor: tx.type === 'Payment' ? 'emerald.50' : 'rose.50', borderRadius: 1.5 }}>
                                  <LinkIcon className={`w-3.5 h-3.5 ${tx.type === 'Payment' ? 'text-emerald-600' : 'text-rose-600'}`} />
                                </Box>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                  {tx.type === 'Payment' ? 'Payment Applied To' : 'Paid By'}
                                </span>
                             </div>
                             
                             <div className="flex flex-col gap-1">
                                {Object.values(grouped).map((group: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between py-2 group/alloc border-b border-slate-50 last:border-0">
                                     <div className="flex items-center gap-2.5">
                                        {tx.type === 'Payment' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
                                        <span className="text-[13px] font-bold text-slate-700">
                                           {group.name}
                                        </span>
                                     </div>
                                     <span className={`text-[13px] font-black ${tx.type === 'Payment' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        ₱{group.amount.toLocaleString()}
                                     </span>
                                  </div>
                                ))}
                             </div>

                             <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {tx.type === 'Payment' ? 'Unapplied Credit' : 'Unpaid Balance'}:
                                </span>
                                <div className="flex flex-col items-end">
                                   <span className={`text-[13px] font-black ${
                                      (tx.type === 'Payment' ? student.total_unapplied_credits : tx.remaining_balance) > 0 
                                        ? (tx.type === 'Payment' ? 'text-emerald-600' : 'text-rose-600') 
                                        : 'text-slate-400'
                                   }`}>
                                      ₱{(tx.type === 'Payment' ? student.total_unapplied_credits : tx.remaining_balance).toLocaleString()}
                                   </span>
                                   {tx.remaining_balance === 0 && tx.type === 'Charge' && (
                                     <span className="text-[9px] font-black text-emerald-600 uppercase mt-1 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">Fully Settled</span>
                                   )}
                                </div>
                             </div>
                          </div>
                         );
                       })()}

                      {tx.allocations.length === 0 && tx.type === 'Charge' && !tx.is_voided && (
                        <div className="mt-3 bg-rose-50/50 border border-rose-100/50 rounded-xl p-3 flex justify-between items-center">
                           <span className="text-[10px] font-black text-rose-600/70 uppercase tracking-widest">Unpaid Balance:</span>
                           <span className="text-[13px] font-black text-rose-700">₱{tx.remaining_balance.toLocaleString()}</span>
                        </div>
                      )}

                      {tx.allocations.length === 0 && tx.type === 'Payment' && tx.remaining_balance > 0 && !tx.is_voided && (
                        <div className="mt-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 flex justify-between items-center">
                           <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest">Unapplied Credit:</span>
                           <span className="text-[13px] font-black text-emerald-700">₱{student.total_unapplied_credits.toLocaleString()}</span>
                        </div>
                      )}

                      {tx.is_voided && (
                        <div className="text-[10px] text-rose-600 font-black mt-4 flex items-center gap-2 bg-rose-50 border border-rose-100 w-full p-3 rounded-xl uppercase tracking-widest">
                          <AlertCircle className="w-4 h-4" />
                          Transaction Voided: {tx.void_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right border-l border-slate-50 align-top">
                      <div className={`text-[15px] font-bold tracking-tight ${
                        tx.is_voided ? 'text-slate-400' : 
                        tx.running_balance > 0 ? 'text-rose-700' : 
                        tx.running_balance < 0 ? 'text-emerald-700' : 'text-slate-600'
                      }`}>
                         {tx.running_balance < 0 ? `(${formatCurrency(Math.abs(tx.running_balance))})` : formatCurrency(tx.running_balance)}
                      </div>
                      <div className="flex flex-col items-end mt-1.5">
                        {tx.is_voided ? (
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cancelled</span>
                        ) : tx.running_balance > 0 ? (
                           <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">Account Due</span>
                        ) : tx.running_balance < 0 ? (
                           <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Advance Balance</span>
                        ) : (
                           <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Cleared</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                      <div className="flex items-center justify-center gap-2">
                        {!tx.is_voided ? (
                          <Tooltip title="Void Transaction" arrow>
                            <button 
                              onClick={() => handleVoid(tx.id)}
                              className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group/btn"
                            >
                              <XCircle className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </Tooltip>
                        ) : (
                          <div className="p-2.5 text-rose-200">
                            <Info className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-12 bg-slate-50/30 flex flex-col items-center">
             <div className="text-slate-300 flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center opacity-30">End of Ledger Records</p>
             </div>
          </div>
        </div>
      </div>

      {student && (
        <AccountingTransactionModal 
          open={isTransactionModalOpen} 
          onClose={() => setIsTransactionModalOpen(false)}
          onSuccess={fetchData}
          student={{
            id: student.id,
            name: student.name,
            program: student.program
          }}
          initialType="Payment"
        />
      )}
        <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
