import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import { Button, Input, Card, Divider } from "antd";
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
      
      // Save password hash and role locally for offline admin verification
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-['Inter', sans-serif]">
      {/* Decorative Subtle Light Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/60 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-50/60 rounded-full blur-[120px]" />

      <div className="w-full max-w-[440px] z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl border border-slate-200/80 mb-6 shadow-sm group hover:scale-105 transition-transform duration-500">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-14 h-14 object-contain group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            POS Terminal
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Sign in to access your point of sale session
          </p>
        </div>

        <Card
          className="bg-white/80 border-slate-200/60 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.06)] rounded-[32px] overflow-hidden"
          styles={{
            body: {
              padding: "40px 32px 32px 32px",
            }
          }}
        >
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">
                Email Address
              </label>
              <Input
                size="large"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<IconMail size={18} className="text-slate-400" />}
                className="h-13 rounded-xl border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-300 focus:border-emerald-500/50 focus:bg-white transition-all text-base font-medium"
                placeholder="pos@neverbe.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">
                Password
              </label>
              <Input.Password
                size="large"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<IconLock size={18} className="text-slate-400" />}
                className="h-13 rounded-xl border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-300 focus:border-emerald-500/50 focus:bg-white transition-all text-base font-medium"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-3">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="h-13 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold uppercase tracking-wider border-none shadow-[0_6px_16px_-4px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </Button>
            </div>
          </form>

          <Divider className="my-5 border-slate-100">
            <span className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.25em]">
              Or Continue With
            </span>
          </Divider>

          <Button
            className="w-full h-13 rounded-xl flex items-center justify-center gap-3 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-all font-semibold text-sm text-slate-600 bg-white"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FcGoogle size={20} />
            <span>Google Account</span>
          </Button>
        </Card>

        <p className="text-center mt-8 text-slate-400 text-[10px] font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Developed by{" "}
          <a
            href="https://vx9studio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-black transition-colors underline"
          >
            VX9Studio
          </a>
        </p>
      </div>
    </div>
  );
}
