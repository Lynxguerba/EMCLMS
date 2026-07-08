import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import axios from "axios";
import { 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2,
  AlertTriangle,
  Info,
  History,
  FileDown,
  ServerCrash
} from "lucide-react";
import { Box, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function AdminDatabaseManagement() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, loading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.user_type !== "Administrator" && user.user_type !== "Superadmin")) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setStatusMessage({ type: 'info', text: "Generating system data archive. Please wait..." });
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/db-backup/`, {
        responseType: 'blob',
        withCredentials: true
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `backup_${new Date().toISOString().split('T')[0]}.dump`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setStatusMessage({ type: 'success', text: "Data archive generated and downloaded successfully." });
    } catch (error: any) {
      console.error("Backup failed:", error);
      
      let errorText = "System failed to generate the archive. Please contact technical support if the issue persists.";
      
      // Since responseType is 'blob', the error data is also a blob
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          if (text) errorText = text;
        } catch (e) {
          console.error("Error parsing error blob:", e);
        }
      } else if (typeof error.response?.data === 'string') {
        errorText = error.response.data;
      }
      
      setStatusMessage({ type: 'error', text: errorText });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    
    const confirmRestore = window.confirm(
      "CONFIRM SYSTEM RESTORE: This action will replace all current system data with the content of the selected archive. This process is irreversible. Proceed with restoration?"
    );
    
    if (!confirmRestore) return;

    setIsRestoring(true);
    setStatusMessage({ type: 'info', text: "Initiating system restoration... Please keep this window active." });
    
    const formData = new FormData();
    formData.append('backup_file', selectedFile);

    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/db-restore/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      setStatusMessage({ type: 'success', text: "System restoration complete. Synchronizing data and reloading..." });
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error: any) {
      console.error("Restore failed:", error);
      
      let errorMsg = "Restoration failed. The archive file may be corrupted or incompatible.";
      
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          if (text) errorMsg = text;
        } catch (e) {
          console.error("Error parsing error blob:", e);
        }
      } else if (typeof error.response?.data === 'string') {
        errorMsg = error.response.data;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsRestoring(false);
      setSelectedFile(null);
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress size="2rem" />
      </Box>
    );
  }

  const isSuperadmin = user?.user_type === "Superadmin";

  return (
    <Box
      sx={{
        height: "100vh",
        overflowY: "auto",
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Sidebar
        userRole={isSuperadmin ? "superadmin" : "admin"}
        currentPath={currentPath}
        open={isSidebarOpen}
        onClose={handleSidebarToggle}
      />
      <Navbar handleSidebarToggle={handleSidebarToggle} />

      <div className="min-h-screen pt-8 p-4 mt-6 md:-mt-2 md:ml-52">
        {/* Page Header */}
        <div className="mb-8 grid items-center gap-2">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-[#0a1a3b]" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0a1a3b] via-[#0f2e6b] to-[#0a1a3b] bg-clip-text text-transparent">
              Database Administration
            </h1>
          </div>
          <p className="text-1xl">
            Maintain system persistence by managing data archives and performing recovery operations.
          </p>
        </div>

        {/* Global Status Message */}
        {statusMessage && (
          <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ${
            statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {statusMessage.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
            <span className="font-medium text-sm">{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Export Section */}
          <div className="relative overflow-hidden rounded-2xl shadow-xl bg-white border border-gray-100 flex flex-col transform transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-[0.03] rounded-full -mr-16 -mt-16"></div>
            <div className="p-6 flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <FileDown className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Data Archive & Backup</h2>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">System Export</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                Generate a comprehensive archive of current system data, including user records, course information, and administrative logs. This ensures data persistence across system updates.
              </p>

              <button
                onClick={handleBackup}
                disabled={isBackingUp || isRestoring}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
                  isBackingUp ? 'bg-blue-400 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 hover:scale-[1.02] active:scale-95 shadow-blue-200'
                }`}
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Archive...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Generate & Download Backup
                  </>
                )}
              </button>
            </div>
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Last Generated: {new Date().toLocaleDateString()}
              </div>
              <span>Archival Format: .dump</span>
            </div>
          </div>

          {/* Import Section */}
          <div className={`relative overflow-hidden rounded-2xl shadow-xl bg-white border border-gray-100 flex flex-col transform transition-all duration-300 hover:shadow-2xl ${!isSuperadmin ? 'opacity-90' : ''}`}>
            {!isSuperadmin && (
              <div className="absolute inset-0 bg-gray-50/10 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-white shadow-xl rounded-2xl mb-4 text-amber-500 border border-amber-50">
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed">System restoration is restricted to Superadmin accounts to ensure data integrity and prevent accidental data loss.</p>
              </div>
            )}
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 opacity-[0.03] rounded-full -mr-16 -mt-16"></div>
            <div className="p-6 flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-rose-50 p-3 rounded-xl">
                  <ServerCrash className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">System Restoration</h2>
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Data Recovery</p>
                </div>
              </div>
              
              <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl mb-6 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <p className="text-xs text-rose-900 leading-normal">
                  <span className="font-bold">CRITICAL:</span> Restoration will replace all active system data. Ensure a contemporary backup is available before proceeding.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    id="db-restore-file"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={!isSuperadmin || isRestoring || isBackingUp}
                    accept=".dump,.sql"
                  />
                  <label
                    htmlFor="db-restore-file"
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
                      selectedFile ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    } ${(!isSuperadmin || isRestoring || isBackingUp) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    {selectedFile ? (
                      <div className="flex items-center gap-3 text-indigo-700">
                        <Database className="w-5 h-5" />
                        <span className="text-sm font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs font-bold text-gray-600">Select Backup Archive</span>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Supported: .dump files</span>
                      </>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleRestore}
                  disabled={!isSuperadmin || !selectedFile || isRestoring || isBackingUp}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
                    !selectedFile || isRestoring ? 'bg-gray-200 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 hover:scale-[1.02] active:scale-95 shadow-rose-200'
                  }`}
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Executing Restoration...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5" />
                      Initiate System Restore
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="px-6 py-4 bg-rose-50/50 border-t border-rose-100 flex items-center justify-center text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em]">
              High Impact Recovery Zone
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-900 rounded-2xl shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
              <Info className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">Data Governance Best Practices</h3>
              <p className="text-sm text-blue-100 leading-relaxed opacity-90">
                Maintain regular data archives to safeguard institutional information. Store backups in isolated, secure environments. 
                Perform system restorations only during scheduled maintenance windows to ensure continuity.
              </p>
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
