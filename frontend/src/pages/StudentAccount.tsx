import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { 
  Box, 
  Typography 
} from "@mui/material";
import { 
  History, 
  CreditCard, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Info
} from "lucide-react";

export default function StudentAccount() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  const [ledger, setLedger] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/student/ledger/`, { withCredentials: true });
      setLedger(res.data);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const transactions = ledger?.transactions || [];
  const balance = ledger?.balance || 0;
  const availableCredit = ledger?.available_credit || 0;
  const lastPayment = ledger?.last_payment_amount || 0;
  const lastPaymentDate = ledger?.last_payment_date;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  return (
    <Box sx={{ height: "100vh", overflowY: "auto", backgroundColor: "#f8fafc" }}>
      <Sidebar userRole="student" currentPath={currentPath} open={isSidebarOpen} onClose={handleSidebarToggle} />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-16 mt-8 md:mt-4 p-4 md:ml-52">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="grid gap-1">
            <h1 className="text-3xl font-extrabold text-[#0a1a3b] tracking-tight">Financial Account</h1>
            <p className="text-slate-500 font-medium">Review your balances, charges, and payments.</p>
          </div>
          
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl shadow-xl hover:shadow-slate-300 transition-all transform hover:scale-[1.02] active:scale-95 text-sm font-black uppercase tracking-widest min-w-[200px] justify-center">
            <Download className="w-5 h-5 text-blue-400" />
            Download SOA
          </button>
        </div>

        {/* Account Status Visualizer */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 gap-4">
           <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${balance > 0 ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                 {balance > 0 ? <AlertCircle className="w-8 h-8 text-rose-600" /> : <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-900">{balance > 0 ? 'Action Required' : 'Account in Good Standing'}</h2>
                 <p className="text-sm font-medium text-slate-500">{balance > 0 ? 'You have an outstanding balance for this term.' : 'All tuition and fees are settled.'}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 scale-150 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform">
                 <CreditCard className="w-20 h-20" />
              </div>
              <div className="relative">
                 <Typography variant="overline" sx={{ fontWeight: 900, color: "#94a3b8", letterSpacing: '2px' }}>Total Outstanding</Typography>
                 <Typography variant="h3" sx={{ fontWeight: 900, color: balance > 0 ? "#e11d48" : "#059669", mt: 1 }}>{formatCurrency(balance)}</Typography>
              </div>
              {balance > 0 && (
                <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-2xl border border-rose-100">
                   <AlertCircle className="w-4 h-4 text-rose-500" />
                   <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Please settle outstanding fees</span>
                </div>
              )}
           </div>

           <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-200/50 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 scale-150 -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform">
                 <CheckCircle2 className="w-20 h-20 text-white" />
              </div>
              <div className="relative">
                 <Typography variant="overline" sx={{ fontWeight: 900, color: "rgba(255,255,255,0.6)", letterSpacing: '2px' }}>Last Payment</Typography>
                 <Typography variant="h3" sx={{ fontWeight: 900, color: "white", mt: 1 }}>{formatCurrency(lastPayment)}</Typography>
              </div>
              <p className="mt-8 text-[11px] font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-4 h-4" /> {lastPaymentDate ? `Posted on ${new Date(lastPaymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : 'No payments yet'}
              </p>
           </div>
           
           <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-6 rounded-[2.5rem] shadow-2xl shadow-emerald-200/50 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 scale-150 -rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform">
                 <FileText className="w-20 h-20 text-white" />
              </div>
              <div className="relative">
                 <Typography variant="overline" sx={{ fontWeight: 900, color: "rgba(255,255,255,0.6)", letterSpacing: '2px' }}>Available Credit</Typography>
                 <Typography variant="h3" sx={{ fontWeight: 900, color: "white", mt: 1 }}>{formatCurrency(availableCredit)}</Typography>
              </div>
              <p className="mt-8 text-[11px] font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
                 <Info className="w-4 h-4" /> Ready for Re-allocation
              </p>
           </div>
        </div>

        {/* Detailed Ledger */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-blue-900" />
              <h2 className="text-xl font-black text-slate-900">Personal Ledger</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white text-slate-400 border-b border-slate-100">
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Description</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-8 py-6 h-16 bg-slate-50/20" />
                    </tr>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((tx: any) => (
                    <tr key={tx.id} className={`hover:bg-slate-50/50 transition-all group ${tx.status === 'Voided' ? 'opacity-40' : ''}`}>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="text-xs font-black text-slate-700">{new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                          tx.status === 'Voided' 
                            ? 'bg-slate-50 text-slate-400 border-slate-200' 
                            : tx.transaction_type === 'Payment' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-slate-600 font-bold group-hover:text-slate-900 transition-colors">
                          {tx.description || <span className="text-slate-400 italic">No description provided.</span>}
                          {tx.status === 'Voided' && <span className="ml-2 text-[8px] font-black text-rose-500 uppercase">(Voided)</span>}
                        </div>
                        
                        {/* Render allocations if they exist */}
                        {tx.allocations && tx.allocations.length > 0 && (
                          <div className="mt-2.5 flex flex-col gap-1.5 pl-3 border-l-2 border-slate-100">
                            {tx.allocations.map((alloc: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                <span className={`w-1.5 h-1.5 rounded-full ${tx.transaction_type === 'Payment' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span>
                                  {tx.transaction_type === 'Payment' ? 'Applied' : 'Paid'} {formatCurrency(alloc.amount)} {tx.transaction_type === 'Payment' ? 'to' : 'via'} <span className="text-slate-700 font-extrabold">{alloc.category}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-right">
                        <div className={`text-base font-black ${
                          tx.transaction_type === 'Payment' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatCurrency(tx.amount)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold uppercase text-[10px]">No transaction history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-12 bg-slate-50/20 flex flex-col items-center">
             <div className="text-slate-200 border-t-4 border-slate-100/50 pt-8 w-full max-w-xs flex flex-col items-center gap-4">
                <FileText className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center opacity-30">End of History</p>
             </div>
          </div>
        </div>
      </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
