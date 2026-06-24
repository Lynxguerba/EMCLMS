import React, { useState } from "react";
import axios from "axios";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  Switch
} from "@mui/material";
import { 
  X, 
  AlertCircle, 
  Info, 
  DollarSign, 
  CheckCircle2,
  Zap
} from "lucide-react";

interface BulkChargeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AccountingBulkChargeModal: React.FC<BulkChargeModalProps> = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    target: "All Currently Enrolled",
    program: "All Programs",
  });
  const [fees, setFees] = useState<any[]>([]);
  const [autoReallocate, setAutoReallocate] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetedStudentCount, setTargetedStudentCount] = useState<number>(0);
  const [targetedNamesPreview, setTargetedNamesPreview] = useState<string[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const [courses, setCourses] = useState<any[]>([]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/courses/`, { withCredentials: true });
      setCourses(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, course_id: res.data[0].id } as any));
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  const fetchFees = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/`, { withCredentials: true });
      const activeFees = res.data.filter((f: any) => f.status === "Active");
      setFees(activeFees);
      if (activeFees.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          category: activeFees[0].name,
          amount: activeFees[0].amount
        }));
      }
    } catch (err) {
      console.error("Failed to fetch fees", err);
    }
  };

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setFormData({
        category: "",
        description: "",
        amount: "",
        target: "All Currently Enrolled",
        program: "All Programs",
      });
      setAutoReallocate(true);
      setErrorMessage("");
      setIsSubmitting(false);
      fetchCourses();
      fetchFees();
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    
    let targetValue = "All";
    if (formData.target === "Filter by Program") targetValue = "Program";
    else if (formData.target === "Filter by Specific Course") targetValue = "Course";

    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/accounting/bulk-charge/preview/`,
          {
            params: {
              target: targetValue,
              program: targetValue === "Program" ? formData.program : undefined,
              course_id: targetValue === "Course" ? (formData as any).course_id : undefined
            },
            withCredentials: true
          }
        );
        setTargetedStudentCount(res.data.student_count);
        setTargetedNamesPreview(res.data.preview_names);
      } catch (err) {
        console.error("Failed to fetch bulk charge preview count", err);
        setTargetedStudentCount(0);
        setTargetedNamesPreview([]);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const isCourseReady = formData.target !== "Filter by Specific Course" || !!(formData as any).course_id;
    const isProgramReady = formData.target !== "Filter by Program" || !!formData.program;
    
    if (isCourseReady && isProgramReady) {
      fetchPreview();
    } else {
      setTargetedStudentCount(0);
      setTargetedNamesPreview([]);
    }
  }, [open, formData.target, formData.program, (formData as any).course_id]);

  const programs = ["AB-Theology", "Master of Divinity programs"];
  const currentSY = "2024-2025 1st semester";

  const amountNum = parseFloat(formData.amount);
  const isAmountValid = !isNaN(amountNum) && amountNum > 0 && amountNum < 100000000;
  const isCourseSelected = formData.target !== "Filter by Specific Course" || !!(formData as any).course_id;
  const isFormValid = !!formData.category && isAmountValid && isCourseSelected && !isPreviewLoading && targetedStudentCount > 0;

  const totalImpact = (parseFloat(formData.amount) || 0) * targetedStudentCount;

  const getTargetText = () => {
    if (formData.target === "All Currently Enrolled") return "all currently enrolled";
    if (formData.target === "Filter by Program") return `all ${formData.program}`;
    if (formData.target === "Filter by Specific Course") {
      const selectedCourse = courses.find(c => c.id === (formData as any).course_id);
      return `enrolled in ${selectedCourse ? selectedCourse.course_code : 'the selected course'}`;
    }
    return "all";
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      let targetValue = "All";
      if (formData.target === "Filter by Program") targetValue = "Program";
      else if (formData.target === "Filter by Specific Course") targetValue = "Course";

      const payload = {
        category: formData.category,
        amount: formData.amount,
        description: formData.description,
        target: targetValue,
        program: targetValue === "Program" ? formData.program : undefined,
        course_id: targetValue === "Course" ? (formData as any).course_id : undefined,
        auto_reallocate: autoReallocate
      };
      
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/accounting/bulk-charge/`,
        payload,
        { withCredentials: true }
      );
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Bulk charge failed", err);
      const msg = err.response?.data?.detail || "An unexpected error occurred. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "32px",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        }
      }}
    >
      <DialogTitle sx={{ p: 4, display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #9f1239, #4c0519)", color: "white" }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
            <DollarSign className="w-6 h-6 text-rose-300" />
          </div>
          <div className="grid">
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>Bulk Charge Fees</Typography>
            <div className="flex items-center gap-2 mt-1">
               <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-200 text-[9px] font-black uppercase tracking-widest rounded border border-blue-500/30">Active Term</span>
               <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 700, fontSize: '10px' }}>{currentSY}</Typography>
            </div>
          </div>
        </div>
        <IconButton onClick={onClose} size="small" sx={{ color: "white/50", '&:hover': { color: "white" } }}>
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, backgroundColor: "#fafafa" }}>
        {errorMessage && (
          <div className="p-4 mb-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <Typography variant="caption" sx={{ color: "#e11d48", fontWeight: 700 }}>
              {errorMessage}
            </Typography>
          </div>
        )}
        {step === 1 ? (
          <div className="space-y-6">
            {fees.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <Typography variant="caption" sx={{ color: "#b45309", fontWeight: 700 }}>
                  No active fees configured. Please add active fees in the Settings tab first.
                </Typography>
              </div>
            )}
            <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <Typography variant="caption" sx={{ color: "#334155", fontWeight: 500, lineHeight: 1.6 }}>
                Post fees for the **Current Term ({currentSY})**. This targets students with active enrollments.
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField 
                select 
                label="Category" 
                fullWidth 
                variant="outlined" 
                value={formData.category}
                onChange={(e) => {
                  const selectedFee = fees.find(f => f.name === e.target.value);
                  setFormData({
                    ...formData, 
                    category: e.target.value,
                    amount: selectedFee ? selectedFee.amount : formData.amount
                  });
                }}
                InputProps={{ sx: { borderRadius: '16px', bgcolor: 'white' } }}
              >
                {fees.map(f => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)}
              </TextField>
              <TextField 
                label="Amount (PHP)" 
                fullWidth 
                placeholder="0.00"
                variant="outlined" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                InputProps={{ 
                  sx: { borderRadius: '16px', bgcolor: 'white' },
                  startAdornment: <div className="mr-2 text-slate-400 font-bold">₱</div>
                }}
              />
            </div>

            <TextField 
              label="Description" 
              fullWidth 
              multiline 
              rows={2} 
              variant="outlined" 
              placeholder="e.g. Registration fee for school year 2024-2025"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              InputProps={{ sx: { borderRadius: '16px', bgcolor: 'white' } }}
            />

            <Divider sx={{ my: 1, opacity: 0.5 }} />

            <div className="space-y-4">
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e293b", px: 1 }}>Target Selection</Typography>
              <div className="grid grid-cols-1 gap-3">
                {["All Currently Enrolled", "Filter by Program", "Filter by Specific Course"].map((opt) => (
                  <button 
                    key={opt}
                    onClick={() => setFormData({...formData, target: opt})}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                      formData.target === opt ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <span className={`text-[11px] font-black uppercase tracking-tight ${formData.target === opt ? 'text-blue-700' : 'text-slate-500'}`}>{opt}</span>
                    </div>
                    {formData.target === opt && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            {formData.target === "Filter by Program" && (
              <TextField 
                select 
                label="Select Program" 
                fullWidth 
                variant="outlined" 
                value={formData.program}
                onChange={(e) => setFormData({...formData, program: e.target.value})}
                InputProps={{ sx: { borderRadius: '16px', bgcolor: 'white' } }}
                className="animate-fade-in-down"
              >
                {programs.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            )}

            {formData.target === "Filter by Specific Course" && (
              <TextField 
                select 
                label="Select Course" 
                fullWidth 
                variant="outlined" 
                value={(formData as any).course_id || ""}
                onChange={(e) => setFormData({...formData, course_id: e.target.value} as any)}
                InputProps={{ sx: { borderRadius: '16px', bgcolor: 'white' } }}
                className="animate-fade-in-down"
              >
                {courses.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.course_code}: {c.course_title}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <div className="bg-emerald-50/50 p-4 rounded-[1.5rem] border border-emerald-100/50 flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Zap className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex flex-col">
                  <Typography variant="caption" sx={{ color: "#064e3b", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Auto-Apply Available Credit
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#047857", fontWeight: 600 }}>
                    Automatically apply existing unused credits to each student's charge
                  </Typography>
                </div>
              </div>
              <Switch 
                checked={autoReallocate}
                onChange={(e) => setAutoReallocate(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10b981' },
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-amber-100 rounded-full">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>
              <div className="grid gap-1">
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#92400e" }}>Ready to Apply?</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: "#92400e", opacity: 0.8 }}>
                  You are about to charge <span className="font-extrabold">{formData.amount} PHP</span> to <span className="font-extrabold">{getTargetText()}</span> students.
                </Typography>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
               <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e293b", opacity: 0.5, textTransform: 'uppercase' }}>Charge Summary</Typography>
               <div className="grid gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Fee Category</span>
                    <span className="text-slate-900 font-black">{formData.category}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Targeted Students</span>
                    <span className="text-slate-900 font-black">
                      {isPreviewLoading ? "Calculating..." : `${targetedStudentCount} students`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total Impact</span>
                    <span className="text-indigo-600 font-black">₱{totalImpact.toLocaleString()}</span>
                  </div>
               </div>
               {targetedStudentCount > 0 && targetedNamesPreview.length > 0 && (
                 <div className="text-[11px] font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100/80 mt-2">
                   <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Preview</span>
                   <span className="text-slate-700">
                     {targetedNamesPreview.join(", ")}
                     {targetedStudentCount > targetedNamesPreview.length && ` and ${targetedStudentCount - targetedNamesPreview.length} others`}
                   </span>
                 </div>
               )}
            </div>

            <FormControlLabel
              control={<Checkbox defaultChecked sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#3b82f6' } }} />}
              label={<Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Notify affected students via in-app dashboard.</Typography>}
              sx={{ px: 1 }}
            />
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 4, pt: 0, gap: 2, backgroundColor: "#fafafa" }}>
        {step === 1 ? (
          <button 
            onClick={handleNext}
            disabled={!isFormValid}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-black text-sm uppercase tracking-widest"
          >
            Review Charges
          </button>
        ) : (
          <>
            <button 
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-black text-sm uppercase tracking-widest"
            >
              Back
            </button>
            <button 
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-[2] py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-2xl shadow-xl hover:shadow-rose-500/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-black text-sm uppercase tracking-widest"
            >
              {isSubmitting ? "Applying..." : "Confirm and Apply"}
            </button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AccountingBulkChargeModal;
