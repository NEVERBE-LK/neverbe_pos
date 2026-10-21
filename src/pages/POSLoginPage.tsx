import React, { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import api from "@/lib/api";
import { IconArrowRight, IconEye, IconEyeOff } from "@tabler/icons-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import BrandLogo from "@/components/BrandLogo";

export default function POSLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "NEVERBE | POS Terminal Sign In";
    emailRef.current?.focus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verify POS authorization with backend
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("data", JSON.stringify({ uid: user.uid }));

      const res = await api.post("/api/v1/auth/login", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data;
      const role = (userData?.role || "").toLowerCase();
      const permissions: string[] = userData?.permissions || [];
      const hasPosAccess = role === "admin" || permissions.includes("access_pos");

      if (!hasPosAccess) {
        await signOut(auth);
        localStorage.removeItem("neverbePOSUserRole");
        localStorage.removeItem("neverbePOSUserPermissions");
        localStorage.removeItem("neverbePOSStockId");
        localStorage.removeItem("neverbePOSCachedStocks");
        toast.error("Access Denied: This account is not authorized to access the POS terminal.");
        return;
      }

      localStorage.setItem("neverbePOSUserRole", role);
      localStorage.setItem("neverbePOSUserPermissions", JSON.stringify(permissions));

      try {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("neverbePOSUserPassHash", hashHex);
      } catch (hashError) {
        console.error("Failed to hash password locally:", hashError);
      }

      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Login Error:", error);
      const status = error?.status || error?.response?.status;
      if (
        status === 401 ||
        status === 403 ||
        error?.message?.includes("401") ||
        error?.message?.includes("403") ||
        error?.message?.toLowerCase().includes("unauthorized") ||
        error?.message?.toLowerCase().includes("forbidden")
      ) {
        await signOut(auth).catch(() => {});
        toast.error("Access Denied: This account is not authorized to access POS.");
      } else {
        toast.error(error.message || "Failed to login. Please check credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verify POS authorization with backend
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("data", JSON.stringify({ uid: user.uid }));

      const res = await api.post("/api/v1/auth/login", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data;
      const role = (userData?.role || "").toLowerCase();
      const permissions: string[] = userData?.permissions || [];
      const hasPosAccess = role === "admin" || permissions.includes("access_pos");

      if (!hasPosAccess) {
        await signOut(auth);
        localStorage.removeItem("neverbePOSUserRole");
        localStorage.removeItem("neverbePOSUserPermissions");
        localStorage.removeItem("neverbePOSStockId");
        localStorage.removeItem("neverbePOSCachedStocks");
        toast.error("Access Denied: This Google account is not authorized to access the POS terminal.");
        return;
      }

      localStorage.setItem("neverbePOSUserRole", role);
      localStorage.setItem("neverbePOSUserPermissions", JSON.stringify(permissions));
      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Google Login Error:", error);
      const status = error?.status || error?.response?.status;
      if (
        status === 401 ||
        status === 403 ||
        error?.message?.includes("401") ||
        error?.message?.includes("403") ||
        error?.message?.toLowerCase().includes("unauthorized") ||
        error?.message?.toLowerCase().includes("forbidden")
      ) {
        await signOut(auth).catch(() => {});
        toast.error("Access Denied: This account is not authorized to access POS.");
      } else {
        toast.error(error.message || "Failed to login with Google.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-neutral-900 select-none">
      {/* LEFT PANEL — Authentic NEVERBE Sportswear Editorial Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-neutral-950">
        <img
          src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80"
          alt="Runners exploring an outdoor trail"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Cinematic gradient overlay matching web app */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50" />

        {/* Visual Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 lg:p-14 w-full h-full">
          {/* Top Wordmark */}
          <div className="flex items-center gap-3">
            <BrandLogo variant="full" className="h-6 w-auto text-white" />
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-md text-white border border-white/20 font-mono">
              POS Terminal
            </span>
          </div>

          {/* Bottom Editorial Copy */}
          <div className="max-w-md">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-400 font-mono mb-3">
              NEVER ORDINARY. ALWAYS YOU.
            </p>
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.05] tracking-tight uppercase mb-4">
              YOUR PACE.
              <br />
              YOUR PEOPLE.
              <br />
              <span className="italic text-emerald-400">YOUR NEVERBE.</span>
            </h2>
            <p className="text-sm text-neutral-300 font-normal leading-relaxed">
              Engineered for the fastest retail checkout and unified store operations.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Clean, Minimal Web-Aligned Form Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white min-h-screen">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <BrandLogo variant="full" className="h-6 w-auto text-black" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200/80 text-[10px] font-black uppercase tracking-wider text-neutral-700 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Retail Terminal</span>
          </div>
        </div>

        {/* Center Auth Form */}
        <div className="w-full max-w-[420px] mx-auto py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 font-mono mb-2">
            THE NEXT MOVE IS YOURS
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 mb-2">
            Good to see you again.
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mb-8 leading-relaxed">
            Sign in with authorized staff credentials to open your terminal session.
          </p>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full min-h-[50px] rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-[13px] font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <FcGoogle size={20} />
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
              or sign in with email
            </span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-800">
                Email address
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cashier@neverbe.lk"
                autoComplete="email"
                required
                className="w-full min-h-[50px] px-4 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-800">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full min-h-[50px] pl-4 pr-12 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[50px] rounded-full bg-black hover:bg-neutral-800 text-white text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-[0.99] border-none"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <IconArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <p className="text-center text-[11px] text-neutral-400 mt-6 font-mono uppercase tracking-wider">
            Authorized NEVERBE retail personnel only
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-6 border-t border-neutral-100">
          <span>Flagship Retail POS</span>
          <span>Encrypted Session</span>
          <span>Sri Lanka · LKR</span>
        </div>
      </div>
    </div>
  );
}
