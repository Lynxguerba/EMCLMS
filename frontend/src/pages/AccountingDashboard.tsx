import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { 
  Box, 
  Typography
} from "@mui/material";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap
} from "lucide-react";

export default function AccountingDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/dashboard-stats/`, { withCredentials: true });
      setStatsData(res.data);
    } catch (err) {
      console.error("Failed to fetch statistics", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);
  };

  const stats = [
    {
      title: "Total Receivables",
      value: formatCurrency(statsData?.total_receivables || 0),
      change: "Global Balance",
      isPositive: false,
      icon: <DollarSign className="w-8 h-8 text-white" />,
      gradient: "from-slate-900 to-slate-800",
    },
    {
      title: "Outstanding Accounts",
      value: statsData?.outstanding_accounts || 0,
      change: "Students with Balances",
      isPositive: true,
      icon: <Users className="w-8 h-8 text-white" />,
      gradient: "from-blue-700 to-indigo-800",
    },
    {
      title: "Total Students",
      value: statsData?.total_students || 0,
      change: "Active Enrollment",
      isPositive: true,
      icon: <Zap className="w-8 h-8 text-white" />,
      gradient: "from-emerald-600 to-teal-700",
    },
  ];

  const recentTransactions = statsData?.recent_transactions || [];
  const categoryStats = statsData?.category_stats || [];

  return (
    <Box sx={{ height: "100vh", overflowY: "auto", backgroundColor: "#f8fafc" }}>
      <Sidebar userRole="accounting" currentPath={currentPath} open={isSidebarOpen} onClose={handleSidebarToggle} />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
        {/* Dashboard Insights Banner */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Title */}
          <div className="lg:col-span-2 bg-[#0a1a3b] rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-center shadow-2xl shadow-blue-900/20">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                      <DollarSign className="w-6 h-6 text-white" />
                   </div>
                   <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                      Accounting Dashboard
                   </h1>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-md">
                   <Clock className="w-3.5 h-3.5 text-blue-300" />
                   <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">As of {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
             </div>
          </div>

          {/* Key Insight 1: Efficiency */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-center text-white">
             <div className="absolute right-0 bottom-0 opacity-10 -mr-4 -mb-4">
                <TrendingUp className="w-24 h-24" />
             </div>
             <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 relative z-10">Payment Progress</p>
             <div className="flex items-end gap-2 relative z-10 mt-1">
                <p className="text-4xl font-black tracking-tighter">{statsData?.collection_rate || 0}%</p>
             </div>
             <div className="mt-5 h-1.5 w-full bg-white/20 rounded-full overflow-hidden relative z-10">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000" 
                  style={{ width: `${statsData?.collection_rate || 0}%` }}>
                </div>
             </div>
          </div>

          {/* Key Insight 2: Unsettled Ledgers */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unsettled Ledgers</p>
             <div className="flex items-center gap-3 mt-1">
                <p className="text-4xl font-black text-[#0a1a3b] tracking-tighter">
                   {statsData?.outstanding_accounts || 0}
                </p>
             </div>
             <button onClick={() => navigate('/AccountingStudents')} className="text-[10px] font-bold text-slate-500 mt-4 flex items-center gap-1 hover:text-blue-600 transition-colors uppercase tracking-widest w-fit">
                Manage Student Budgets <ArrowUpRight className="w-3 h-3" />
             </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`relative overflow-hidden rounded-[2.5rem] shadow-2xl bg-gradient-to-br ${stat.gradient} p-8 group`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest mb-4">
                  {stat.title}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stat.isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {stat.change}
                       </span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/10 group-hover:rotate-12 transition-transform">
                    {stat.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Collection Progress */}
          <div className="rounded-[2.5rem] shadow-xl bg-white p-8 border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl">
                     <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">Payment Progress</h2>
               </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                   <p className="text-lg font-black text-emerald-500">{statsData?.collection_rate || 0}%</p>
                </div>
            </div>
                        <div className="space-y-6 flex-1">
               {categoryStats.length > 0 ? categoryStats.map((item: any, i: number) => (
                 <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-black text-slate-600 uppercase tracking-wide">{item.category}</span>
                       <span className="text-xs font-bold text-slate-400">{formatCurrency(item.collected)} collected</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${item.percentage}%` }}
                       ></div>
                    </div>
                 </div>
               )) : (
                 <p className="text-slate-400 text-xs font-bold uppercase text-center py-10">No category breakdown available</p>
               )}
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
               <p className="text-[10px] text-slate-500 font-medium text-center italic">
                  * Data reflects current semester collections as of {new Date().toLocaleDateString()}
               </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="rounded-[2.5rem] shadow-xl bg-white p-8 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 rounded-xl">
                    <Clock className="w-5 h-5 text-blue-600" />
                 </div>
                 <h2 className="text-xl font-black text-slate-800">Recent Activity</h2>
              </div>
              <button 
                onClick={() => navigate('/AccountingStudents')}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-slate-50 rounded-[2rem] animate-pulse" />
                ))
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-[2rem] border border-slate-50 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${tx.transaction_type === 'Payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {tx.transaction_type === 'Payment' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: '#1e293b' }}>
                        {tx.student_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.2px' }}>
                        {tx.transaction_type} • {new Date(tx.date).toLocaleDateString()}
                      </Typography>
                    </div>
                  </div>
                  <div className="text-right">
                    <Typography variant="body2" sx={{ fontWeight: 900, color: tx.transaction_type === 'Payment' ? '#059669' : '#e11d48' }}>
                      {formatCurrency(tx.amount)}
                    </Typography>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest outline outline-1 outline-offset-1 ${
                      tx.status === 'Success' ? 'bg-emerald-100 text-emerald-700 outline-emerald-200' :
                      tx.status === 'Voided' ? 'bg-rose-100 text-rose-700 outline-rose-200' :
                      'bg-slate-100 text-slate-500 outline-slate-200'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
              ) : (
                <p className="text-slate-400 text-xs font-bold uppercase text-center py-10">No recent transactions</p>
              )}
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
