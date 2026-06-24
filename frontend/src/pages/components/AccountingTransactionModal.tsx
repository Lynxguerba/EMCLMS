import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Avatar, 
  IconButton,
  TextField,
  MenuItem,
  Switch,
  Typography
} from "@mui/material";
import { 
  X, 
  Info, 
  CreditCard,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Zap
} from "lucide-react";
import axios from "axios";
import { format, parseISO } from "date-fns";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  student?: {
    id: number | string;
    name: string;
    program: string;
  };
  initialType?: "Payment" | "Charge";
}

const AccountingTransactionModal: React.FC<TransactionModalProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  student, 
  initialType = "Payment" 
}) => {
  const PAYMENT_MODES = ["Cash", "Check", "Bank Transfer", "Scholarship", "Other"];
  const [type, setType] = useState<"Payment" | "Charge">(initialType);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    notifyStudent: true,
  });
  const [fees, setFees] = useState<any[]>([]);
  const [unpaidCharges, setUnpaidCharges] = useState<any[]>([]);
  const [unusedCredits, setUnusedCredits] = useState<any[]>([]);
  const [selectedCreditIds, setSelectedCreditIds] = useState<number[]>([]);
  const [allocations, setAllocations] = useState<{[key: number]: string}>({});
  const [isLoadingUnpaid, setIsLoadingUnpaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoReallocate, setAutoReallocate] = useState(true);

  const fetchFees = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/fees/`, { withCredentials: true });
      const activeFees = res.data.filter((f: any) => f.status === "Active");
      setFees(activeFees);
      if (activeFees.length > 0 && !formData.category) {
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

  const fetchUnpaidCharges = async () => {
    if (!student?.id) return;
    setIsLoadingUnpaid(true);
    try {
      const [chargesRes, creditsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/students/${student.id}/unpaid-charges/`, { withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/accounting/students/${student.id}/unused-credits/`, { withCredentials: true })
      ]);
      setUnpaidCharges(chargesRes.data);
      setUnusedCredits(creditsRes.data);
      setAllocations({});
    } catch (err) {
      console.error("Failed to fetch unpaid data", err);
    } finally {
      setIsLoadingUnpaid(false);
    }
  };

  useEffect(() => {
    if (open) {
      setType(initialType);
      fetchFees();
      fetchUnpaidCharges();
      setErrorMessage("");
    }
  }, [open, initialType, student?.id]);

  useEffect(() => {
    fetchUnpaidCharges();
    if (type === "Payment") {
      if (!PAYMENT_MODES.includes(formData.category)) {
        setFormData(prev => ({ ...prev, category: "Cash", amount: "" }));
      }
    } else {
      if (fees.length > 0) {
        if (!fees.some(f => f.name === formData.category)) {
          setFormData(prev => ({ ...prev, category: fees[0].name, amount: fees[0].amount }));
        }
      } else {
        setFormData(prev => ({ ...prev, category: "", amount: "" }));
      }
    }
  }, [type, fees]);

  const handleTypeChange = (newType: "Payment" | "Charge") => {
    setType(newType);
    setSelectedCreditIds([]);
    setAllocations({});
    if (newType === "Payment") {
      setFormData(prev => ({ ...prev, category: "Cash", amount: "" }));
    } else {
      if (fees.length > 0) {
        setFormData(prev => ({ ...prev, category: fees[0].name, amount: fees[0].amount }));
      } else {
        setFormData(prev => ({ ...prev, category: "", amount: "" }));
      }
    }
  };

  const selectedCredits = unusedCredits.filter(c => selectedCreditIds.includes(c.id));
  const creditAmount = selectedCredits.reduce((sum, c) => sum + c.remaining, 0);
  const paymentAmount = parseFloat(formData.amount) || 0;
  const totalAvailable = paymentAmount + creditAmount;

  const totalUnusedCredit = unusedCredits.reduce((sum, c) => sum + (parseFloat(c.remaining) || 0), 0);
  const chargeAmount = parseFloat(formData.amount) || 0;
  const appliedCredit = Math.min(totalUnusedCredit, chargeAmount);

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const isAllocationMismatched = totalAllocated > totalAvailable;
  const remainingToAllocate = Math.max(0, totalAvailable - totalAllocated);

  const handleAllocateFull = (charge: any) => {
    const currentAllocatedForThisCharge = parseFloat(allocations[charge.id] || "0");
    const otherAllocated = totalAllocated - currentAllocatedForThisCharge;
    const available = Math.max(0, totalAvailable - otherAllocated);
    const amountToAllocate = Math.min(available, charge.remaining);
    
    if (amountToAllocate > 0) {
      setAllocations(prev => ({ ...prev, [charge.id]: amountToAllocate.toFixed(2) }));
    } else {
      const newAllocations = { ...allocations };
      delete newAllocations[charge.id];
      setAllocations(newAllocations);
    }
  };

  const handleAutoAllocate = () => {
    let currentPool = totalAvailable;
    const newAllocations: {[key: number]: string} = {};
    
    const sortedCharges = [...unpaidCharges].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const charge of sortedCharges) {
      if (currentPool <= 0) break;
      const amountToAllocate = Math.min(currentPool, charge.remaining);
      newAllocations[charge.id] = amountToAllocate.toFixed(2);
      currentPool -= amountToAllocate;
    }
    setAllocations(newAllocations);
  };

  const handleClearAllocations = () => {
    setAllocations({});
  };


  const handleSubmit = async () => {
    if (!student?.id) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      // Safely parse amounts
      const totalCashPool = parseFloat(formData.amount) || 0;
      
      const creditPools = selectedCredits.map(c => ({ 
        id: c.id, 
        remaining: parseFloat(c.remaining.toString()) || 0 
      }));
      let remainingCash = totalCashPool;
      
      const reallocationsList: any[] = [];
      const newAllocationsList: any[] = [];
      
      // Sort allocations by ID to ensure consistent order or use the unpaidCharges order
      const sortedAllocationKeys = Object.keys(allocations).sort((a, b) => parseInt(a) - parseInt(b));

      sortedAllocationKeys.forEach(chargeId => {
        let amountNeeded = parseFloat(allocations[parseInt(chargeId)]) || 0;
        if (amountNeeded <= 0) return;
        const idInt = parseInt(chargeId);

        // 1. Try to fund from credits first
        for (const pool of creditPools) {
          if (amountNeeded <= 0) break;
          if (pool.remaining <= 0) continue;

          const fromCredit = Math.min(amountNeeded, pool.remaining);
          reallocationsList.push({
            credit_id: pool.id,
            charge_id: idInt,
            amount: fromCredit.toFixed(2)
          });
          pool.remaining -= fromCredit;
          amountNeeded -= fromCredit;
        }

        // 2. Fund remainder from the new cash payment (if any left)
        if (amountNeeded > 0 && remainingCash > 0) {
          const fromCash = Math.min(amountNeeded, remainingCash);
          newAllocationsList.push({
            charge_id: idInt,
            amount: fromCash.toFixed(2)
          });
          remainingCash -= fromCash;
        }
      });

      const payload = {
        student_id: student.id,
        amount: totalCashPool.toFixed(2),
        transaction_type: type,
        category: formData.category,
        description: formData.description,
        notify_student: formData.notifyStudent,
        allocations: newAllocationsList,
        reallocations: reallocationsList,
        ...(type === "Charge" ? { auto_reallocate: autoReallocate } : {})
      };
      
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/accounting/transactions/`,
        payload,
        { withCredentials: true }
      );
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to post transaction", err);
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
          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        }
      }}
    >
      <DialogTitle sx={{ p: 4, display: "flex", alignItems: "center", justifyContent: "space-between", background: type === "Payment" ? "linear-gradient(to right, #059669, #10b981)" : "linear-gradient(to right, #e11d48, #be123c)", color: "white" }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
            {type === "Payment" ? <CreditCard className="w-6 h-6 text-white" /> : <PlusCircle className="w-6 h-6 text-white" />}
          </div>
          <div className="grid">
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '1.4rem' }}>
              {type === "Payment" ? "Record Payment" : "Add Charge"}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.95, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', fontSize: '12px' }}>
              Financial Entry
            </Typography>
          </div>
        </div>
        <IconButton onClick={onClose} size="small" sx={{ color: "white", opacity: 0.7, '&:hover': { opacity: 1 } }}>
          <X className="w-5 h-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, backgroundColor: "#fafafa" }}>
        <div className="space-y-6 mt-2">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <Info className="w-5 h-5 text-rose-500 shrink-0" />
              <Typography variant="caption" sx={{ color: "#e11d48", fontWeight: 700 }}>
                {errorMessage}
              </Typography>
            </div>
          )}

          {student?.name && (
            <div className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 900, fontSize: '16px', width: 48, height: 48 }}>
                {student.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>{student.name}</Typography>
                <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600 }}>{student.program}</Typography>
              </div>
            </div>
          )}

          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button
              onClick={() => handleTypeChange("Payment")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all ${
                type === "Payment" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ArrowDownRight className="w-5 h-5" />
              Payment
            </button>
            <button
              onClick={() => handleTypeChange("Charge")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all ${
                type === "Charge" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ArrowUpRight className="w-5 h-5" />
              Charge
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField 
              select 
              label={type === "Payment" ? "Payment Mode" : "Fee Category"}
              fullWidth 
              variant="outlined" 
              value={type === "Payment" 
                ? (PAYMENT_MODES.includes(formData.category) ? formData.category : "")
                : (fees.some(f => f.name === formData.category) ? formData.category : "")
              }
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
              {type === "Payment" ? (
                PAYMENT_MODES.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)
              ) : (
                fees.map((f: any) => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)
              )}
            </TextField>
            <TextField 
              label={type === "Payment" ? "Payment Amount" : "Charge Amount"}
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

          {type === "Payment" && unusedCredits.length > 0 && (
            <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50 border-dashed">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#064e3b", textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Available Credit Re-allocation
                  </Typography>
                </div>
                <span className="text-[11px] font-bold py-1 px-3 bg-emerald-100 text-emerald-800 rounded-lg uppercase tracking-wide">
                  {unusedCredits.length} Credits
                </span>
              </div>
              
              <div className="space-y-2">
                {unusedCredits.length === 0 ? (
                  <div className="text-[10px] text-emerald-600/50 font-bold italic py-2">No available credits found for this student.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                        const groupedCredits = unusedCredits.reduce((acc: any, curr: any) => {
                          if (!acc[curr.category]) {
                            acc[curr.category] = { category: curr.category, remaining: 0, ids: [] };
                          }
                          acc[curr.category].remaining += parseFloat(curr.remaining) || 0;
                          acc[curr.category].ids.push(curr.id);
                          return acc;
                        }, {});

                        return Object.values(groupedCredits).map((c: any) => {
                          const isSelected = c.ids.every((id: number) => selectedCreditIds.includes(id));
                          return (
                            <button
                              key={c.category}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedCreditIds(prev => prev.filter(id => !c.ids.includes(id)));
                                } else {
                                  const idsToAdd = c.ids.filter((id: number) => !selectedCreditIds.includes(id));
                                  setSelectedCreditIds(prev => [...prev, ...idsToAdd]);
                                }
                              }}
                              className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left min-w-[150px] flex-1 ${
                                isSelected 
                                ? 'bg-emerald-700 border-emerald-700 text-white shadow-lg shadow-emerald-200/50' 
                                : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-300'
                              }`}
                            >
                              <span className="text-[11px] font-bold uppercase tracking-tight truncate w-full mb-1">{c.category}</span>
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-[14px] font-bold ${isSelected ? 'text-white' : 'text-emerald-800'}`}>
                                  ₱{c.remaining.toLocaleString()}
                                </span>
                              </div>
                            </button>
                          );
                        });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {type === "Payment" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Specific Fee Allocation
                    </Typography>
                    <div className="flex gap-2.5">
                      <button 
                        onClick={handleAutoAllocate}
                        disabled={totalAvailable <= 0 || unpaidCharges.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-extrabold uppercase hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-emerald-200"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Auto-Allocate
                      </button>
                      <button 
                        onClick={handleClearAllocations}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-extrabold uppercase hover:bg-slate-200 transition-all border border-slate-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Available Pool:</span>
                    <span className="text-[14px] font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">₱{totalAvailable.toLocaleString()}</span>
                    {totalAllocated > 0 && (
                      <>
                        <div className="w-[1px] h-4 bg-slate-300 mx-2" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allocated:</span>
                        <span className="text-[14px] font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-md border border-blue-200">₱{totalAllocated.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                {isAllocationMismatched && (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-xs font-bold text-rose-600 uppercase animate-pulse">
                      <Info className="w-4 h-4" />
                      Mismatched
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 uppercase mt-1">Budget Exceeded</span>
                  </div>
                )}
              </div>
              
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Unpaid Fee</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Remaining</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider text-center" style={{ width: '140px' }}>To Allocate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {isLoadingUnpaid ? (
                        <tr><td colSpan={3} className="p-8 text-center text-xs text-slate-400 animate-pulse font-bold">Fetching accounts...</td></tr>
                      ) : unpaidCharges.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-xs text-slate-400 font-bold">No outstanding charges found.</td></tr>
                      ) : (
                        unpaidCharges.map(charge => (
                          <tr key={charge.id} className={`transition-colors even:bg-slate-100/30 border-b border-slate-200 ${allocations[charge.id] ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80 bg-white'}`}>
                            <td className="px-4 py-2 mt-0.5">
                               <div className="text-[13px] font-bold text-slate-800">{charge.category}</div>
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{format(parseISO(charge.created_at), "MMM dd, yyyy")}</div>
                            </td>
                            <td className="px-4 py-2 text-right text-[13px] font-bold text-slate-700">
                               ₱{charge.remaining.toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                               <div className="relative group/input">
                                  <input 
                                    type="text"
                                    value={allocations[charge.id] || ""}
                                    onChange={(e) => setAllocations({...allocations, [charge.id]: e.target.value})}
                                    placeholder="0.00"
                                    className={`w-full pl-7 pr-3 py-2 bg-white border-2 rounded-xl text-[13px] font-bold text-right outline-none transition-all ${
                                      allocations[charge.id] ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-slate-100 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-sm'
                                    }`}
                                  />
                                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold ${allocations[charge.id] ? 'text-emerald-700' : 'text-slate-400'}`}>₱</span>
                                  <button 
                                    onClick={() => handleAllocateFull(charge)}
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 p-1.5 bg-white border-2 border-slate-100 rounded-lg shadow-md scale-0 group-hover/input:scale-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all z-20"
                                    title="Allocate Full"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50/80 px-4 py-3 grid grid-cols-2 gap-4 border-t border-slate-100">
                   <div className="grid">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Allocated</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[18px] font-bold ${totalAllocated > totalAvailable ? 'text-rose-700' : 'text-emerald-700'}`}>₱{totalAllocated.toLocaleString()}</span>
                        {totalAllocated === totalAvailable && totalAvailable > 0 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      </div>
                   </div>
                   <div className="grid text-right">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {totalAllocated > totalAvailable ? "Over-allocated" : "Left to Allocate"}
                      </span>
                      <span className={`text-[18px] font-bold mt-1 ${
                        totalAllocated > totalAvailable ? 'text-rose-700' : 
                        (totalAllocated === totalAvailable && totalAvailable > 0) ? 'text-emerald-700' : 
                        'text-slate-600'
                      }`}>
                        ₱{Math.abs(totalAvailable - totalAllocated).toLocaleString()}
                      </span>
                   </div>
                </div>

                {totalAllocated > 0 && (
                  <div className="mx-4 mb-4 mt-3 px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl shadow-inner">
                    <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500 mb-3 border-b border-slate-100 pb-2">
                        <span>Fund Consumption Priority</span>
                        <span className="text-blue-600">Credit Used First</span>
                    </div>
                    <div className="space-y-2.5">
                        {creditAmount > 0 && (
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-600 font-semibold">From Existing Credit:</span>
                            <span className="text-emerald-700">+ ₱{Math.min(creditAmount, totalAllocated).toLocaleString()}</span>
                        </div>
                        )}
                        {(totalAllocated - creditAmount) > 0 && (
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-600 font-semibold">From New Payment:</span>
                            <span className="text-emerald-700">+ ₱{(totalAllocated - Math.max(0, creditAmount)).toFixed(2)}</span>
                        </div>
                        )}
                    </div>
                  </div>
                )}

                {totalAvailable > 0 && totalAllocated < totalAvailable && (
                   <div className="px-5 py-3 bg-blue-50/50 border-t border-blue-100">
                     <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textAlign: 'center', lineHeight: 1.5 }}>
                       Note: ₱{remainingToAllocate.toLocaleString()} will remain as unapplied general credit. 
                       <br/>Debt balance will only decrease by ₱{totalAllocated.toLocaleString()}.
                     </Typography>
                   </div>
                )}
              </div>
            </div>
          )}

          <TextField 
            label="Description / Remarks" 
            fullWidth 
            multiline 
            rows={2} 
            variant="outlined" 
            placeholder={type === "Payment" ? "e.g. Partial payment for tuition" : "e.g. Additional library fine"}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            InputProps={{ sx: { borderRadius: '16px', bgcolor: 'white' } }}
          />

          {type === "Charge" && totalUnusedCredit > 0 && (
            <div className="bg-emerald-50/50 p-4 rounded-[1.5rem] border border-emerald-100/50 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Zap className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex flex-col">
                  <Typography variant="caption" sx={{ color: "#064e3b", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Auto-Apply Available Credit
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#047857", fontWeight: 600 }}>
                    Apply up to ₱{appliedCredit.toLocaleString()} of unused credits to this charge
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
          )}

          <div className="bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <Typography variant="caption" sx={{ color: "#1e293b", fontWeight: 700 }}>
                Notify student of this entry
              </Typography>
            </div>
            <Switch 
              checked={formData.notifyStudent}
              onChange={(e) => setFormData({...formData, notifyStudent: e.target.checked})}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#3b82f6' },
              }}
            />
          </div>
        </div>
      </DialogContent>

      <DialogActions sx={{ p: 4, pt: 0, backgroundColor: "#fafafa" }}>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || isAllocationMismatched || (type === "Payment" && totalAvailable <= 0)}
          className={`w-full py-4 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 font-black text-sm uppercase tracking-widest text-white disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed ${
            type === "Payment" ? "bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-500/20" : "bg-gradient-to-r from-rose-600 to-rose-700 shadow-rose-900/20"
          }`}
        >
          {isSubmitting ? "Processing..." : (
            type === "Payment" 
              ? (paymentAmount > 0 ? "Post Payment" : "Confirm Allocation") 
              : "Post Charge"
          )}
        </button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountingTransactionModal;
