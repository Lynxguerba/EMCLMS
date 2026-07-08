import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Box, CircularProgress, Avatar } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
 ResponsiveContainer,
} from "recharts";
import { PieChart as MuiPieChart } from "@mui/x-charts";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  useLibrarianTotalBooks,
  useLibrarianBorrowedToday,
  useLibrarianOverdueBooks,
  useLibrarianTotalSearch,
  useLibrarianMostSearched,
  useBooks,
  useLibrarianWeeklyActivity,
  useLibrarianRecentActivity,
  useLibrarianBookRequests,
  useLibrarianMostAccessedBooks
} from "../hooks/useQueries";
import {
  MetricCardSkeleton,
  ChartCardSkeleton,
  ActivityFeedSkeleton
} from "./components/Skeletons";
import {
 BookOpen,
 TrendingUp,
 ArrowRight,
 BarChart3,
 Calendar,
 Clock,
 Activity,
 PieChart as Piechart1,
} from "lucide-react";

// Define types for the new book statistics
interface BorrowActivity {
 id: number | string;
 user: string;
 book: string;
 action: "borrowed" | "returned" | "overdue";
 date: string;
}

const CustomTooltip = (props: any) => {
 const { active, payload } = props;
 if (active && payload && payload.length) {
  return (
   <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
    <p className="text-sm font-semibold text-gray-900">
     {payload[0].payload.day}
    </p>
    {payload.map((entry: any, index: number) => (
     <p key={index} className="text-sm" style={{ color: entry.color }}>
      {entry.name}: {entry.value}
     </p>
    ))}
   </div>
  );
 }
 return null;
};

export default function LibrarianDashboard() {
 const theme = useTheme();
 const location = useLocation();
 const navigate = useNavigate();
 const { user, loading: authLoading } = useAuth();
 const currentPath = location.pathname;

 const [isSidebarOpen, setIsSidebarOpen] = useState(false);
 const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

 // Queries
 const totalBooksQuery = useLibrarianTotalBooks();
 const borrowedTodayQuery = useLibrarianBorrowedToday();
 const overdueBooksQuery = useLibrarianOverdueBooks();
 const totalSearchQuery = useLibrarianTotalSearch();
 const mostSearchedQuery = useLibrarianMostSearched();
 const allBooksQuery = useBooks();
   const weeklyActivityQuery = useLibrarianWeeklyActivity();
   const recentActivityQuery = useLibrarianRecentActivity();
   const bookRequestsQuery = useLibrarianBookRequests();
   const mostAccessedQuery = useLibrarianMostAccessedBooks();
 
   const colors = [  "#5973ff",
  "#ff6666",
  "#36a2eb",
  "#ffcd56",
  "#4bc0c0",
  "#EC4899",
  "#06B6D4",
  "#F97316",
 ];

 const calculateBookshelfDistribution = (books: any[]) => {
  const bookshelfMap: { [key: string]: number } = {};

  books.forEach((book) => {
   const shelf = book.bookshelf__name || "Unassigned";
   bookshelfMap[shelf] = (bookshelfMap[shelf] || 0) + 1;
  });

  const distribution = Object.entries(bookshelfMap).map((entry, index) => ({
   name: entry[0],
   value: entry[1],
   color: colors[index % colors.length],
  }));

  return distribution;
 };

 const bookshelfDistribution = allBooksQuery.data 
  ? calculateBookshelfDistribution(allBooksQuery.data)
  : [];

 const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
 };

 const getAvatarColor = (name = "") => {
  const colors = [
   "bg-blue-500",
   "bg-green-500",
   "bg-purple-500",
   "bg-indigo-500",
   "bg-pink-500",
   "bg-yellow-500",
   "bg-red-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
   hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
 };

 useEffect(() => {
  if (!authLoading && (!user || user.user_type !== "Librarian")) {
   navigate("/");
  }
 }, [user, authLoading, navigate]);

 const getActionBadge = (action: string) => {
  const styles = {
   borrowed: "bg-green-100 text-green-800",
   returned: "bg-blue-100 text-blue-800",
   overdue: "bg-red-100 text-red-800",
  };
  return styles[action as keyof typeof styles] || "bg-gray-100 text-gray-700";
 };

 if (authLoading) {
  return (
   <Box
    sx={{
     display: "flex",
     justifyContent: "center",
     alignItems: "center",
     height: "100vh",
    }}
   >
    <CircularProgress size="2rem" />
   </Box>
  );
 }

 if (!user) return null;

 const pieChartColors = [
  "#5973ff",
  "#ff6666",
  "#36a2eb",
  "#ffcd56",
  "#4bc0c0",
 ];

 return (
  <Box
   sx={{
    height: "100vh",
    overflowY: "auto",
    backgroundColor: theme.palette.background.default,
   }}
  >
   <Sidebar
    userRole="librarian"
    currentPath={currentPath}
    open={isSidebarOpen}
    onClose={handleSidebarToggle}
   />
   <Navbar handleSidebarToggle={handleSidebarToggle} />

   <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
    {/* Dashboard Title */}
    <div className="mb-8 grid items-center gap-2">
     <div className="flex items-center gap-3">
      <BarChart3 className="w-6 h-6 text-[#0a1a3b]" />
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
       Librarian Dashboard
      </h1>
     </div>
     <p className="text-1xl">Managing and Monitoring Library Resources</p>
    </div>

    {/* Quick Stats Row - 4 Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
     {/* Total Available Books Card */}
     {totalBooksQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Total Available Books
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <BookOpen className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">{totalBooksQuery.data?.count ?? 0}</p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Total Recommended Card */}
     {totalSearchQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-sky-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Total Recommended
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <TrendingUp className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">
            {totalSearchQuery.data?.count ?? 0}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Borrowed Today Card */}
     {borrowedTodayQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-emerald-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Borrowed Today
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <Calendar className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">
            {borrowedTodayQuery.data?.count ?? 0}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}

     {/* Overdue Books Card */}
     {overdueBooksQuery.isLoading ? (
       <MetricCardSkeleton />
     ) : (
       <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 p-6 transform transition-all duration-300 hover:scale-105">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
         <p className="text-rose-100 text-sm font-semibold uppercase tracking-wide mb-4">
          Overdue Books
         </p>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-xl">
            <Clock className="w-8 h-8 text-black" />
           </div>
           <p className="text-5xl font-bold text-white">
            {overdueBooksQuery.data?.count ?? 0}
           </p>
          </div>
         </div>
        </div>
       </div>
     )}
    </div>

    {/* Main Graphs Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Most Recommended Section */}
      {mostSearchedQuery.isLoading ? (
        <ChartCardSkeleton title="Most Recommended Books" />
      ) : (
        <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 flex flex-col h-[400px]">
         <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-gray-900">
            Most Recommended Books
            </h2>
          </div>
          <button
           onClick={() => navigate("/LibrarianManageBooks")}
           className="flex items-center gap-2 px-4 py-2 rounded-lg 
            bg-gradient-to-r from-blue-900 to-blue-700 
            text-white font-semibold shadow-md 
            hover:from-blue-800 hover:to-blue-600 
            active:scale-95 transition-all duration-200"
          >
           View All
           <ArrowRight className="w-4 h-4" />
          </button>
         </div>
 
         <div className="bg-white rounded-xl p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          {mostSearchedQuery.data?.books && mostSearchedQuery.data.books.length > 0 ? (
           mostSearchedQuery.data.books.map((book: any, index: number) => (
            <div key={index} className="space-y-2">
             <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 truncate flex-1">
               {book.title}
              </p>
              <span className="ml-3 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
               {book.recommendation_count} recs
              </span>
             </div>
             <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
               className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full transition-all duration-500"
               style={{
                width: `${
                 (book.recommendation_count /
                  (mostSearchedQuery.data.books[0]?.recommendation_count ||
                   1)) *
                 100
                }%`,
               }}
              ></div>
             </div>
            </div>
           ))
          ) : (
           <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-center">No recommended books found.</p>
           </div>
          )}
         </div>
        </div>
      )}
 
      {/* Most Accessed Section */}
      {mostAccessedQuery.isLoading ? (
        <ChartCardSkeleton title="Most Accessed Books" />
      ) : (
        <div className="rounded-2xl shadow-xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 flex flex-col h-[400px]">
         <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-900" />
            <h2 className="text-lg font-bold text-gray-900">
            Most Accessed Books
            </h2>
          </div>
          <div className="text-xs text-gray-500 italic">Unique clicks per 24h</div>
         </div>
 
         <div className="bg-white rounded-xl p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          {mostAccessedQuery.data && mostAccessedQuery.data.length > 0 ? (
           mostAccessedQuery.data.map((book: any, index: number) => (
            <div key={index} className="space-y-2">
             <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 truncate flex-1">
               {book.title}
              </p>
              <span className="ml-3 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
               {book.access_count} clicks
              </span>
             </div>
             <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
               className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full transition-all duration-500"
               style={{
                width: `${
                 (book.access_count /
                  (mostAccessedQuery.data[0]?.access_count ||
                   1)) *
                 100
                }%`,
               }}
              ></div>
             </div>
            </div>
           ))
          ) : (
           <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-center">No access data yet.</p>
           </div>
          )}
         </div>
        </div>
      )}
     </div>
 
     {/* Distribution and Requests Row */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
     {/* Bookshelf Distribution - MUI Pie Chart */}
     {allBooksQuery.isLoading ? (
       <ChartCardSkeleton title="Bookshelf Distribution" />
     ) : (
       <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 flex flex-col h-[400px]">
        <div className="flex items-center gap-2 mb-4">
         <Piechart1 className="w-5 h-5 text-blue-900" />
         <h2 className="text-lg font-bold text-gray-900">
          Bookshelf Distribution
         </h2>
        </div>
        <div className="bg-white rounded-xl p-4 flex items-center justify-center flex-1">
         <MuiPieChart
          series={[
           {
            data: bookshelfDistribution.map((d, index) => ({
             id: index,
             value: d.value,
             label: d.name,
             color: pieChartColors[index % pieChartColors.length],
            })),
            innerRadius: 30,
            outerRadius: 100,
            paddingAngle: 1,
            cornerRadius: 7,
            highlightScope: { fade: "global", highlight: "item" },
            faded: {
             innerRadius: 30,
             additionalRadius: -30,
             color: "gray",
            },
           },
          ]}
          width={250}
          height={200}
         />
        </div>
       </div>
     )}

     {/* Recent Book Requests Section */}
     {bookRequestsQuery.isLoading ? (
       <ActivityFeedSkeleton title="Recent Book Requests" />
     ) : (
       <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 flex flex-col h-[400px]">
        <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-900" />
          <h2 className="text-lg font-bold text-gray-900">
           Recent Book Requests
          </h2>
         </div>
         <button
          onClick={() => navigate("/LibrarianBookRequests")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg 
           bg-gradient-to-r from-blue-900 to-blue-700 
           text-white font-semibold 
           shadow-md shadow-blue-900/20
           hover:from-blue-800 hover:to-blue-600 
           hover:shadow-blue-800/30
           active:scale-95
           transition-all duration-200"
         >
          Manage
          <ArrowRight className="w-4 h-4" />
         </button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
         {(!bookRequestsQuery.data || bookRequestsQuery.data.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
           <BookOpen className="w-12 h-12 mb-3 opacity-50" />
           <p className="text-sm text-center">No active requests</p>
          </div>
         ) : (
          (bookRequestsQuery.data as any[]).slice(0, 10).map((request) => (
           <div
            key={request.request_id}
            className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-300 transition-colors shadow-sm"
           >
            <div className="flex-1 min-w-0">
             <p className="text-sm font-semibold text-gray-900 truncate">
              {request.user_name}
             </p>
             <p className="text-xs text-gray-600 truncate">
              {request.book_title}
             </p>
            </div>
            <div className="flex flex-col items-end gap-1 ml-2">
             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
               request.status === 'Pending' 
                 ? 'bg-yellow-100 text-yellow-800' 
                 : 'bg-blue-100 text-blue-800'
             }`}>
              {request.status}
             </span>
             <p className="text-[10px] text-gray-400">
              {new Date(request.request_date).toLocaleDateString()}
             </p>
            </div>
           </div>
          ))
         )}
        </div>
       </div>
     )}
    </div>

    {/* Bottom Section - Recent Activity and Weekly Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
     {/* Weekly Borrow/Return Activity - Bar Chart */}
     {weeklyActivityQuery.isLoading ? (
       <ChartCardSkeleton title="Weekly Activity" />
     ) : (
       <div className="rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
         <BarChart3 className="w-5 h-5 text-[#0a1a3b]" />
         <h3 className="text-lg font-bold text-gray-900">
          Weekly Activity
         </h3>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-inner border border-gray-100">
         <ResponsiveContainer width="100%" height={280}>
          <BarChart
           data={weeklyActivityQuery.data || []}
           margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
           <defs>
            <linearGradient
             id="borrowedGradient"
             x1="0"
             y1="0"
             x2="0"
             y2="1"
            >
             <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
             <stop
              offset="100%"
              stopColor="#6366F1"
              stopOpacity={0.7}
             />
            </linearGradient>
            <linearGradient
             id="returnedGradient"
             x1="0"
             y1="0"
             x2="0"
             y2="1"
            >
             <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
             <stop
              offset="100%"
              stopColor="#14B8A6"
              stopOpacity={0.7}
             />
            </linearGradient>
           </defs>
           <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            opacity={0.5}
           />
           <XAxis
            dataKey="day"
            stroke="#6B7280"
            tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: "#E5E7EB" }}
           />
           <YAxis
            stroke="#6B7280"
            tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: "#E5E7EB" }}
           />
           <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
           />
           <Legend
            wrapperStyle={{
             paddingTop: "20px",
             fontSize: "13px",
             fontWeight: 600,
            }}
            iconType="circle"
           />
           <Bar
            dataKey="borrowed"
            fill="url(#borrowedGradient)"
            radius={[10, 10, 0, 0]}
            name="Borrowed"
            maxBarSize={40}
           />
           <Bar
            dataKey="returned"
            fill="url(#returnedGradient)"
            radius={[10, 10, 0, 0]}
            name="Returned"
            maxBarSize={40}
           />
          </BarChart>
         </ResponsiveContainer>
        </div>
       </div>
     )}
     {/* Recent Activity Card (similar to Last Online Users in Admin Dashboard) */}
     {recentActivityQuery.isLoading ? (
       <ActivityFeedSkeleton title="Recent Activity" />
     ) : (
       <div className="rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="flex items-center gap-2 mb-6">
         <Activity className="w-5 h-5 text-blue-900" />
         <h2 className="text-lg font-bold text-gray-900">
          Recent Activity
         </h2>
        </div>

        <div className="space-y-3 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
         {(!recentActivityQuery.data || recentActivityQuery.data.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
           <Activity className="w-12 h-12 mb-3 opacity-50" />
           <p className="text-sm text-center">No recent activity</p>
          </div>
         ) : (
          (recentActivityQuery.data as BorrowActivity[]).map((activity) => (
           <div
            key={activity.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
           >
            <div className="flex items-center gap-3">
             <Avatar
              sx={{ width: 40, height: 40 }}
              className={getAvatarColor(activity.user)}
             >
              {getInitials(activity.user)}
             </Avatar>
             <div>
              <p className="text-sm font-semibold text-gray-900">
               {activity.user}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
               {activity.book}
              </p>
             </div>
            </div>
            <div className="flex flex-col items-end gap-1">
             <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(
               activity.action
              )}`}
             >
              {activity.action}
             </span>
             <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(activity.date), {
               addSuffix: true,
              })}
             </span>
            </div>
           </div>
          ))
         )}
        </div>
       </div>
     )}
    </div>
   </div>
    <div className="md:ml-52">
     <Footer />
    </div>
   </Box>
  );
}
