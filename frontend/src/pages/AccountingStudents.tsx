import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { 
  Box, 
  Avatar, 
  Tooltip,
  Menu,
  MenuItem
} from "@mui/material";
import { 
  Search, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle,
  FileText,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  ChevronDown,
  BookOpen
} from "lucide-react";
import axios from "axios";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import AccountingBulkChargeModal from "./components/AccountingBulkChargeModal";
import AccountingTransactionModal from "./components/AccountingTransactionModal";

export default function AccountingStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ receivables: 0, outstanding: 0, total_students: 0 });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<"Payment" | "Charge">("Payment");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("All Programs");
  const [balanceFilter, setBalanceFilter] = useState("All"); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [programAnchorEl, setProgramAnchorEl] = useState<null | HTMLElement>(null);

  const handleProgramMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setProgramAnchorEl(event.currentTarget);
  };

  const handleProgramMenuClose = () => {
    setProgramAnchorEl(null);
  };

  const handleProgramSelect = (program: string) => {
    setSelectedProgram(program);
    handleProgramMenuClose();
    setCurrentPage(1);
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/students/`, {
        params: {
          search: searchQuery,
          program: selectedProgram,
          balance: balanceFilter
        },
        withCredentials: true
      });
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/dashboard-stats/`, { withCredentials: true });
      setStats({
        receivables: res.data.total_receivables,
        outstanding: res.data.outstanding_accounts,
        total_students: res.data.total_students
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchQuery, selectedProgram, balanceFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const filteredStudents = students; // Filtering already done in backend

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const formatFriendlyDate = (dateString: string | null) => {
    if (!dateString) return { main: "Never", sub: "No records" };
    try {
      const date = parseISO(dateString);
      return {
        main: format(date, "MMM dd, yyyy"),
        sub: formatDistanceToNow(date, { addSuffix: true })
      };
    } catch (e) {
      return { main: dateString, sub: "" };
    }
  };

  const handleRecordPayment = (student: any) => {
    setSelectedStudent(student);
    setTransactionType("Payment");
    setIsTransactionModalOpen(true);
  };

  const totals = useMemo(() => {
    return { receivables: stats.receivables, outstanding: stats.outstanding };
  }, [stats]);

  return (
    <Box sx={{ height: "100vh", overflowY: "auto", backgroundColor: "#f8fafc" }}>
      <Sidebar userRole="accounting" currentPath={currentPath} open={isSidebarOpen} onClose={handleSidebarToggle} />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-24 md:pt-28 p-4 md:ml-52">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="grid items-center gap-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent uppercase tracking-tight">
                Student Ledgers
              </h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">Monitor balances and record financial transactions.</p>
          </div>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:scale-[1.02] active:scale-95 text-sm font-black uppercase tracking-widest"
          >
            <PlusCircle className="w-5 h-5" />
            Bulk Charge Fee
          </button>
        </div>

        {/* Summary Mini-Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           {[
             { title: "Total Students", value: stats.total_students, icon: <Users className="w-5 h-5" />, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
             { title: "Active Receivables", value: formatCurrency(totals.receivables), icon: <DollarSign className="w-5 h-5" />, color: "bg-rose-50 text-rose-600", border: "border-rose-100" },
             { title: "Outstanding Accounts", value: totals.outstanding, icon: <AlertCircle className="w-5 h-5" />, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
             { title: "Collection Rate", value: "84%", icon: <TrendingUp className="w-5 h-5" />, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" }
           ].map((stat, i) => (
             <div key={i} className={`bg-white p-5 rounded-3xl border ${stat.border} shadow-sm flex items-center justify-between group hover:shadow-md transition-all`}>
                <div className="grid gap-0.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.title}</p>
                   <p className="text-xl font-black text-slate-800">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                   {stat.icon}
                </div>
             </div>
           ))}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button
              onClick={handleProgramMenuOpen}
              className="w-full md:w-auto flex items-center justify-between gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all text-sm font-black uppercase tracking-widest group"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span>{selectedProgram}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${Boolean(programAnchorEl) ? 'rotate-180' : ''}`} />
            </button>

            <Menu
              anchorEl={programAnchorEl}
              open={Boolean(programAnchorEl)}
              onClose={handleProgramMenuClose}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  borderRadius: '24px',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                  border: '1px solid #f1f5f9',
                  minWidth: '220px',
                  p: 1
                }
              }}
            >
              {[
                { label: "All Programs", value: "All Programs" },
                { label: "AB-Theology", value: "AB-Theology" },
                { label: "Master of Divinity", value: "Master of Divinity programs" }
              ].map((prog) => (
                <MenuItem 
                  key={prog.value}
                  onClick={() => handleProgramSelect(prog.value)}
                  sx={{ 
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    px: 3,
                    py: 1.5,
                    color: selectedProgram === prog.value ? '#1d4ed8' : '#64748b',
                    bgcolor: selectedProgram === prog.value ? '#eff6ff' : 'transparent',
                    '&:hover': { bgcolor: '#f8fafc', color: '#1d4ed8' }
                  }}
                >
                  {prog.label}
                </MenuItem>
              ))}
            </Menu>
          </div>

          {/* Quick Filter Status Chips */}
          <div className="flex flex-wrap items-center gap-3 px-2">
            {[
              { label: "All Students", value: "All", color: "bg-slate-100 text-slate-600" },
              { label: "Outstanding Balances", value: "Outstanding", color: "bg-amber-100 text-amber-700" },
              { label: "Cleared Accounts", value: "Cleared", color: "bg-emerald-100 text-emerald-700" }
            ].map((chip) => (
              <button
                key={chip.value}
                onClick={() => setBalanceFilter(chip.value)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  balanceFilter === chip.value 
                    ? `${chip.color} shadow-lg shadow-black/5 scale-105 ring-2 ring-offset-2 ring-blue-500/10` 
                    : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-50"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend / Info */}
        <div className="mb-6 flex flex-wrap items-center gap-6 px-4">
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-200"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding Balance</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overpaid / Advance</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-lg shadow-slate-200"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cleared Account</span>
           </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900/95 text-white">
                  <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest opacity-80">Student</th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest opacity-80">Program</th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest opacity-80">Outstanding Balance</th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest opacity-80">Last Payment</th>
                  <th className="px-6 py-3.5 text-center text-[10px] font-black uppercase tracking-widest opacity-80">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-5 h-16 bg-slate-50/50" />
                    </tr>
                  ))
                ) : currentStudents.length > 0 ? (
                  currentStudents.map((student) => {
                  const dateInfo = formatFriendlyDate(student.last_payment);
                  return (
                    <tr key={student.id} className="hover:bg-slate-100/50 even:bg-slate-100/30 transition-all group bg-white border-b border-slate-200">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <Avatar sx={{ 
                            width: 44, 
                            height: 44, 
                            bgcolor: 'white', 
                            color: '#3b82f6', 
                            fontWeight: 900, 
                            fontSize: '14px',
                            border: '2px solid #f1f5f9',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}>
                            {student.name.split(' ').map((n: string) => n[0]).join('')}
                          </Avatar>
                          <div className="grid gap-0.5">
                            <div className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">{student.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                          {student.program}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className={`flex items-center gap-2 text-sm font-black ${student.balance > 0 ? 'text-rose-600' : student.balance < 0 ? 'text-emerald-600' : 'text-slate-400 opacity-50'}`}>
                          {formatCurrency(student.balance)}
                          {student.balance > 10000 && (
                            <Tooltip title="High Balance Alert" arrow>
                              <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-start gap-3">
                           <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-white transition-colors">
                              <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                           </div>
                           <div className="flex flex-col">
                              <div className="text-[12px] font-black text-slate-700 tracking-tight">{dateInfo.main}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{dateInfo.sub}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/AccountingStudent/${student.id}/ledger`)}
                            className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group/btn"
                            title="View Ledger"
                          >
                            <FileText className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleRecordPayment(student)}
                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/btn"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                       No students found matching the criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-50/50 px-8 py-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="text-slate-900">{filteredStudents.length}</span> entries
            </p>
            <div className="flex items-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                      currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AccountingBulkChargeModal 
        open={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        onSuccess={fetchStudents}
      />
      
      <AccountingTransactionModal 
        open={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)}
        student={selectedStudent}
        initialType={transactionType}
        onSuccess={fetchStudents}
      />
        <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
