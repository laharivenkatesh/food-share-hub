import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Leaf, Mail, Phone, Lock, ArrowLeft, ArrowRight, ShieldCheck, RefreshCw, KeyRound, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOtp, verifyOtp, user } = useAuth();

  // Navigation redirect destination
  const from = location.state?.from?.pathname || "/";

  // If already authenticated, redirect away from auth page
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Auth flow states
  const [step, setStep] = useState<"email" | "otp">("email");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  
  // Signup/Login fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(true); // default agreed

  // OTP inputs state (6 digits)
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Expiration and Resend Timers
  const [resendTimer, setResendTimer] = useState(30);
  const [expiryTimer, setExpiryTimer] = useState(300); // 5 minutes in seconds

  // Interval references
  const resendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const expiryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start the 30s resend timer
  const startResendTimer = () => {
    setResendTimer(30);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start the 5m expiry timer
  const startExpiryTimer = () => {
    setExpiryTimer(300);
    if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
    expiryIntervalRef.current = setInterval(() => {
      setExpiryTimer((prev) => {
        if (prev <= 1) {
          if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
          toast.error("Your verification code has expired. Please request a new one.");
          setStep("email"); // bounce back
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
      if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
    };
  }, []);

  // Formats expiry time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Step 1: Submit Email to receive OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address format.");
      return;
    }

    if (authMode === "signup") {
      if (!name.trim()) {
        toast.error("Please enter your full name.");
        return;
      }
      if (!phone.trim()) {
        toast.error("Please enter your mobile number.");
        return;
      }
      if (!password) {
        toast.error("Please enter a password.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match. Please verify.");
        return;
      }
      if (!agreed) {
        toast.error("Please accept the food quality and sharing guidelines.");
        return;
      }
    }

    setBusy(true);
    const res = await sendOtp(
      email, 
      authMode === "signup" ? password : undefined, 
      authMode === "signup" ? name : undefined, 
      authMode === "signup" ? phone : undefined, 
      authMode
    );
    setBusy(false);

    if (!res.ok) {
      toast.error("error" in res ? res.error : "An error occurred");
      return;
    }

    toast.success("Verification code dispatched successfully!");

    setStep("otp");
    startResendTimer();
    startExpiryTimer();
    // Clear out any old values
    setOtpValues(Array(6).fill(""));
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  // Trigger Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setBusy(true);
    const res = await sendOtp(
      email, 
      authMode === "signup" ? password : undefined, 
      authMode === "signup" ? name : undefined, 
      authMode === "signup" ? phone : undefined, 
      authMode
    );
    setBusy(false);

    if (!res.ok) {
      toast.error("error" in res ? res.error : "An error occurred");
      return;
    }

    toast.success("A fresh verification code has been sent!");

    startResendTimer();
    startExpiryTimer();
    setOtpValues(Array(6).fill(""));
    inputRefs.current[0]?.focus();
  };

  // Handles input box typing, focusing next element automatically
  const handleOtpChange = (index: number, val: string) => {
    if (/[^0-9]/.test(val)) return; // Allow only numeric entries

    const newValues = [...otpValues];
    newValues[index] = val;
    setOtpValues(newValues);

    if (val && index < 5) {
      // Shift focus to the next field
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handles backspace and backward navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpValues[index] && index > 0) {
        const newValues = [...otpValues];
        newValues[index - 1] = "";
        setOtpValues(newValues);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newValues = [...otpValues];
        newValues[index] = "";
        setOtpValues(newValues);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handles pasting of full 6-digit verification code
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedText)) {
      toast.error("Please paste a valid 6-digit numeric verification code.");
      return;
    }

    const digits = pastedText.split("");
    setOtpValues(digits);
    // Focus last cell
    inputRefs.current[5]?.focus();
  };

  // Submit entered OTP code for verification
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otpValues.join("");

    if (otpCode.length < 6) {
      toast.error("Please complete the 6-digit verification grid.");
      return;
    }

    setBusy(true);
    const res = await verifyOtp(
      email,
      otpCode,
      authMode === "signup" ? "signup" : "magiclink"
    );
    setBusy(false);

    if (!res.ok) {
      toast.error("error" in res ? res.error : "An error occurred");
      return;
    }

    toast.success("Access authorized. Redirecting to home dashboard...");
    navigate(from, { replace: true });
  };

  // Auto-submit OTP when all 6 cells are filled
  useEffect(() => {
    if (otpValues.join("").length === 6) {
      handleVerifyOtp();
    }
  }, [otpValues]);

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4 transition-all duration-300 relative overflow-hidden">
      {/* Decorative Floating Blobs for eco-branding */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[60px] pointer-events-none animate-pulse-soft" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/30 blur-[60px] pointer-events-none animate-pulse-soft" style={{ animationDelay: "1s" }} />

      <div className="w-full max-w-sm bg-card/90 backdrop-blur-md border border-border p-6 rounded-3xl shadow-card space-y-6 animate-fade-up relative z-10">
        
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-deep flex items-center justify-center shadow-soft transform hover:scale-105 transition-all">
            <Leaf className="w-8 h-8 text-primary-deep-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
            Zerra Food Hub
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed px-4">
            {step === "email"
              ? "Share leftover food, save the planet. Authenticate to continue."
              : "We have dispatched a 6-digit security code."}
          </p>
        </div>

        {step === "email" ? (
          <div className="space-y-5">
            {/* Tab Selector */}
            <div className="relative flex p-1 bg-muted rounded-2xl border border-border">
              {/* Active slider background */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-card shadow-soft transition-all duration-300 ease-out transform ${
                  authMode === "signup" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                }`} 
              />
              
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-bold transition-colors duration-200 ${
                  authMode === "login" ? "text-primary-deep" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`relative z-10 flex-1 py-2 text-center text-xs font-bold transition-colors duration-200 ${
                  authMode === "signup" ? "text-primary-deep" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              {authMode === "signup" && (
                <div className="space-y-4 animate-fade-up">
                  {/* Name field */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-muted-foreground">
                        <UserIcon className="w-4 h-4" />
                      </span>
                      <input
                        className="input-field pl-10 py-2.5 text-sm rounded-xl focus:ring-1 focus:ring-primary-deep focus:border-primary-deep"
                        placeholder="John Doe"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={authMode === "signup"}
                      />
                    </div>
                  </div>

                  {/* Phone Number field */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        className="input-field pl-10 py-2.5 text-sm rounded-xl focus:ring-1 focus:ring-primary-deep focus:border-primary-deep"
                        placeholder="9876543210"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required={authMode === "signup"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Address field */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-muted-foreground font-bold text-sm">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    className="input-field pl-10 py-2.5 text-sm rounded-xl focus:ring-1 focus:ring-primary-deep focus:border-primary-deep"
                    placeholder="yourname@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {authMode === "signup" && (
                <div className="space-y-4 animate-fade-up">
                  {/* Password field */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        className="input-field pl-10 py-2.5 text-sm rounded-xl focus:ring-1 focus:ring-primary-deep focus:border-primary-deep"
                        placeholder="••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={authMode === "signup"}
                      />
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        className="input-field pl-10 py-2.5 text-sm rounded-xl focus:ring-1 focus:ring-primary-deep focus:border-primary-deep"
                        placeholder="••••••••"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required={authMode === "signup"}
                      />
                    </div>
                  </div>

                  <div className="pt-1 animate-fade-up">
                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-primary-deep focus:ring-primary-deep cursor-pointer shrink-0"
                      />
                      <span className="text-[10px] text-muted-foreground leading-snug select-none">
                        I accept the food quality and sharing guidelines.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || (authMode === "signup" && !agreed)}
                className="btn-primary flex items-center justify-center gap-2 group mt-2 h-11 text-sm rounded-xl"
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    {authMode === "login" ? "Get Verification Code" : "Register & Get OTP"}{" "}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* OTP VERIFICATION STEP */
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-up">
            {/* Target Email display card */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Sending OTP to</p>
                <p className="text-xs font-extrabold text-foreground truncate">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                }}
                className="px-2.5 py-1 text-[10px] font-semibold text-primary-deep hover:text-emerald-700 bg-card border border-border rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1 shrink-0"
              >
                <ArrowLeft className="w-3 h-3" /> Edit
              </button>
            </div>

            {/* OTP Grid */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                6-Digit OTP Code
              </label>
              <div className="flex justify-between gap-1.5">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-9 h-11 text-center text-lg font-extrabold text-foreground bg-input hover:bg-input/80 focus:bg-white focus:ring-1 focus:ring-primary-deep focus:border-primary-deep border border-border rounded-lg transition-all shadow-sm focus:outline-none"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            {/* Expiry and Resend Timer */}
            <div className="flex items-center justify-between text-[10px] font-bold px-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground/80" />
                <span>Expires in:</span>
                <span className="text-urgent">{formatTime(expiryTimer)}</span>
              </div>

              {resendTimer > 0 ? (
                <span className="text-muted-foreground">Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={busy}
                  className="text-primary-deep hover:underline transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5 animate-pulse" /> Resend OTP
                </button>
              )}
            </div>

            {/* No sandbox for Supabase */}

            <button
              type="submit"
              disabled={busy || otpValues.join("").length < 6}
              className="btn-primary flex items-center justify-center gap-2 h-11 text-sm rounded-xl"
            >
              {busy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Verify & Access
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}