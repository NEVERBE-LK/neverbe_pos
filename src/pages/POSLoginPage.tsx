import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import { Button, Input } from "antd";
import { IconMail, IconLock } from "@tabler/icons-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

export default function POSLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "POS | Login";
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
      
      try {
        const tokenResult = await user.getIdTokenResult();
        const role = (tokenResult.claims.role as string || "").toLowerCase();
        localStorage.setItem("neverbePOSUserRole", role);

        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("neverbePOSUserPassHash", hashHex);
      } catch (hashError) {
        console.error("Failed to hash password locally:", hashError);
      }

      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Login Error:", error);
      toast.error(
        error.message || "Failed to login. Please check credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Authenticating with Google...");
    } catch (error: any) {
      console.error("Google Login Error:", error);
      toast.error(
        error.message || "Failed to login with Google.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-6 relative overflow-hidden font-['Inter', sans-serif]">
      {/* Dynamic Animated Ambient Background Glows */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0px, 0px) scale(1.05); }
          50% { transform: translate(-40px, 40px) scale(0.95); }
        }
        .animate-float-1 {
          animation: float-slow 15s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-reverse 18s ease-in-out infinite;
        }
        .premium-input .ant-input-prefix {
          color: #6b7280 !important;
          margin-right: 10px !important;
        }
        .premium-input input {
          color: #fff !important;
        }
        .premium-input input::placeholder {
          color: #4b5563 !important;
        }
      `}</style>

      {/* Floating Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none animate-float-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-500/[0.04] rounded-full blur-[120px] pointer-events-none animate-float-2" />
      <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-emerald-600/[0.02] rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        {/* Main Glassmorphic Login Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] rounded-[32px] p-8 md:p-10 relative overflow-hidden">
          {/* Subtle top card accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          {/* Logo Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/[0.02] border border-white/[0.08] rounded-2xl mb-4 shadow-2xl group hover:border-emerald-500/30 transition-all duration-500">
              <img
                src="/logo.png"
                alt="NEVERBE Logo"
                className="w-12 h-12 object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase mb-1">
              NEVERBE
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              POS Terminal Login
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Username / Email
              </label>
              <Input
                size="large"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<IconMail size={18} />}
                placeholder="pos@neverbe.com"
                className="premium-input h-13 bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] focus:border-emerald-500 focus:bg-white/[0.04] transition-all rounded-xl text-base"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Password
              </label>
              <Input.Password
                size="large"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<IconLock size={18} />}
                placeholder="••••••••"
                className="premium-input h-13 bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15] focus:border-emerald-500 focus:bg-white/[0.04] transition-all rounded-xl text-base"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                }}
              />
            </div>

            <div className="pt-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="h-13 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-black uppercase tracking-widest border-none shadow-[0_8px_30px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "AUTHENTICATING..." : "SIGN IN"}
              </Button>
            </div>
          </form>

          <div className="relative flex py-4 items-center my-4">
            <div className="flex-grow border-t border-white/[0.05]"></div>
            <span className="flex-shrink mx-4 text-zinc-600 text-[9px] font-extrabold uppercase tracking-[0.25em]">
              OR SIGN IN WITH
            </span>
            <div className="flex-grow border-t border-white/[0.05]"></div>
          </div>

          <Button
            className="w-full h-13 rounded-xl flex items-center justify-center gap-3 border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all font-bold text-xs uppercase tracking-widest text-zinc-300 bg-white/[0.01]"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              borderColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              color: "#d1d5db",
            }}
          >
            <FcGoogle size={18} />
            <span>Google Account</span>
          </Button>
        </div>

        {/* Footer Credit */}
        <p className="text-center mt-8 text-zinc-600 text-[10px] font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Developed by{" "}
          <a
            href="https://vx9studio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-white transition-colors underline"
          >
            VX9Studio
          </a>
        </p>
      </div>
    </div>
  );
}
