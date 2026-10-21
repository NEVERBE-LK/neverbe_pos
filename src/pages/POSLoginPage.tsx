import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import api from "@/lib/api";
import { Button, Input } from "antd";
import { IconMail, IconLock, IconShieldCheck } from "@tabler/icons-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import BrandLogo from "@/components/BrandLogo";

export default function POSLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "NEVERBE | POS Terminal Login";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080908] text-white flex items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Background Subtle Sportswear Illumination */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Technical Corner Brackets */}
      <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-white/20 pointer-events-none" />
      <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-white/20 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-white/20 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-white/20 pointer-events-none" />

      <style>{`
        .pos-terminal-input .ant-input-prefix {
          color: #71717a !important;
          margin-right: 12px !important;
        }
        .pos-terminal-input input {
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .pos-terminal-input input::placeholder {
          color: #52525b !important;
        }
        .pos-terminal-input.ant-input-affix-wrapper {
          background-color: #121412 !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .pos-terminal-input.ant-input-affix-wrapper:hover {
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
        .pos-terminal-input.ant-input-affix-wrapper:focus,
        .pos-terminal-input.ant-input-affix-wrapper-focused {
          border-color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>

      <div className="w-full max-w-[430px] z-10">
        {/* Main Athletic Terminal Card */}
        <div className="bg-[#101210]/95 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] rounded-[28px] p-8 md:p-10 relative">
          {/* Header Brand */}
          <div className="text-center mb-9">
            <div className="inline-flex items-center justify-center mb-4">
              <BrandLogo className="h-8 w-auto text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xs font-black text-white uppercase tracking-[0.25em]">
                POS TERMINAL
              </h1>
            </div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              Flagship Retail Access · Point of Sale
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest ml-1">
                Cashier ID / Email
              </label>
              <Input
                size="large"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<IconMail size={18} />}
                placeholder="pos@neverbe.lk"
                className="pos-terminal-input h-12 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest ml-1">
                Terminal Password
              </label>
              <Input.Password
                size="large"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<IconLock size={18} />}
                placeholder="••••••••"
                className="pos-terminal-input h-12 rounded-xl text-sm"
              />
            </div>

            <div className="pt-3">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="h-13 rounded-xl !bg-white hover:!bg-zinc-200 !text-black text-xs font-black uppercase tracking-[0.18em] border-none transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-white/20"
              >
                {loading ? "AUTHENTICATING..." : "SIGN IN TO TERMINAL"}
              </Button>
            </div>
          </form>

          <div className="relative flex py-4 items-center my-3">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-4 text-zinc-500 text-[9px] font-extrabold uppercase tracking-[0.25em]">
              OR
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <Button
            className="w-full h-12 rounded-xl flex items-center justify-center gap-3 !bg-[#161816] !border-white/10 hover:!border-white/25 hover:!bg-[#1d201d] transition-all font-bold text-xs uppercase tracking-widest !text-white"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FcGoogle size={18} />
            <span>Sign in with Google</span>
          </Button>

          {/* Security Badge */}
          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] font-semibold text-zinc-500">
            <IconShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Encrypted POS session · Authorized personnel only</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center mt-7 text-zinc-600 text-[10px] font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} NEVERBE POS · All Rights Reserved
        </p>
      </div>
    </div>
  );
}
