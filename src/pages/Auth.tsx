import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Leaf, Phone, ArrowLeft, ArrowRight, ShieldCheck, RefreshCw, KeyRound, User as UserIcon, GraduationCap, Store, Building } from "lucide-react";
import { useAuth, Role } from "@/hooks/useAuth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier } from "firebase/auth";

const roles: Role[] = ["Student", "Provider", "NGO"];

const roleIcons: Record<Role, React.ComponentType<{ className?: string }>> = {
  Student: GraduationCap,
  Provider: Store,
  NGO: Building,
};

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
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Student");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(true); // default agreed

  // OTP inputs state (6 digits)
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Expiration and Resend Timers
  const [resendTimer, setResendTimer] = useState(30);
  const [expiryTimer, setExpiryTimer] = useState(300); // 5 minutes in seconds
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);

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
          setStep("phone"); // bounce back
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
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error("Error clearing RecaptchaVerifier:", e);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Formats expiry time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Step 1: Submit Phone Number to receive OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    if (authMode === "signup" && !name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (authMode === "signup" && !agreed) {
      toast.error("Please accept the food quality and sharing guidelines.");
      return;
    }

    setBusy(true);

    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      } catch (err: any) {
        toast.error("Safety verification failed to initialize: " + err.message);
        setBusy(false);
        return;
      }
    }

    const res = await sendOtp(phone, recaptchaVerifierRef.current);
    setBusy(false);

    if (!res.ok) {
      toast.error("error" in res ? res.error : "An error occurred");
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      return;
    }

    toast.success("Verification code dispatched successfully!");
    setSandboxOtp(null);

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

    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      } catch (err: any) {
        toast.error("Safety verification failed to initialize: " + err.message);
        setBusy(false);
        return;
      }
    }

    const res = await sendOtp(phone, recaptchaVerifierRef.current);
    setBusy(false);

    if (!res.ok) {
      toast.error("error" in res ? res.error : "An error occurred");
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
        recaptchaVerifierRef.current = null;
      }
      return;
    }

    toast.success("A fresh verification code has been sent!");
    setSandboxOtp(null);

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
      phone,
      otpCode,
      authMode === "signup" ? name : undefined,
      authMode === "signup" ? role : undefined
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
            {step === "phone"
              ? "Share leftover food, save the planet. Authenticate to continue."
              : "We have dispatched a 6-digit security code."}
          </p>
        </div>

        {step === "phone" ? (
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

                  {/* Roles Selector with beautiful card designs */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Choose Account Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map((r) => {
                        const isSelected = role === r;
                        const IconComponent = roleIcons[r];
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
                              isSelected
                                ? "bg-primary/20 border-primary-deep text-primary-deep shadow-sm scale-[1.02]"
                                : "bg-muted/40 hover:bg-muted/80 text-muted-foreground border-transparent hover:scale-[1.01]"
                            }`}
                          >
                            <IconComponent className={`w-4 h-4 ${isSelected ? "text-primary-deep" : "text-muted-foreground"}`} />
                            <span className="font-extrabold text-[9px] capitalize">{r}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-muted-foreground font-bold text-sm">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    className="input-field pl-10 py-2.5 text-sm rounded-xl focus:ring-1 focus:ring-primary-deep focus:border-primary-deep"
                    placeholder="9876543210"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">
                  Format: E.164 (+1234567890) or plain 10-digit number.
                </p>
              </div>

              {authMode === "signup" && (
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
            {/* Target Phone display card */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
              <div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Sending OTP to</p>
                <p className="text-xs font-extrabold text-foreground">{phone}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setSandboxOtp(null);
                }}
                className="px-2.5 py-1 text-[10px] font-semibold text-primary-deep hover:text-emerald-700 bg-card border border-border rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1"
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

            {/* SMS Sandbox Active notification */}
            {sandboxOtp && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-up">
                <div>
                  <p className="text-[9px] text-primary-deep font-bold uppercase tracking-wider">SMS Sandbox Mode</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">OTP is: <strong className="text-primary-deep font-extrabold text-xs">{sandboxOtp}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sandboxOtp);
                    toast.success("OTP copied!");
                  }}
                  className="px-2 py-0.5 text-[9px] font-bold text-primary-deep hover:bg-primary/20 border border-primary/30 rounded-md transition-colors"
                >
                  Copy
                </button>
              </div>
            )}

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
      
      {/* Invisible reCAPTCHA Anchor */}
      <div id="recaptcha-container" className="hidden"></div>
    </div>
  );
}