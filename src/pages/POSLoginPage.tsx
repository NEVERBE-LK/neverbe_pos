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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-['Inter', sans-serif]">
      {/* Decorative Brand Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-zinc-800/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-3xl mb-6 shadow-2xl group hover:scale-[1.03] transition-all duration-300">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-14 h-14 object-contain group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-300"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            POS Terminal
          </h1>
          <p className="text-zinc-400 text-sm font-medium">
            Sign in to access your point of sale session
          </p>
        </div>

        <Card
          className="bg-zinc-900/40 border-zinc-800/60 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[32px] overflow-hidden"
          styles={{
            body: {
              padding: "40px 32px 32px 32px",
            }
          }}
        >
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                Email Address
              </label>
              <Input
                size="large"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<IconMail size={18} className="text-zinc-500 mr-1" />}
                className="h-13 rounded-xl text-zinc-100 placeholder:text-zinc-600 transition-all text-base font-medium [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-zinc-100 [&_.ant-input-password-icon]:!text-zinc-400 [&_.ant-input-affix-wrapper]:!bg-zinc-950/40 [&_.ant-input-affix-wrapper]:!border-zinc-800 [&_.ant-input-affix-wrapper-focused]:!border-zinc-700 [&_.ant-input-affix-wrapper-focused]:!bg-zinc-950/70 [&_.ant-input-affix-wrapper]:hover:!border-zinc-700"
                placeholder="pos@neverbe.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                Password
              </label>
              <Input.Password
                size="large"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<IconLock size={18} className="text-zinc-500 mr-1" />}
                className="h-13 rounded-xl text-zinc-100 placeholder:text-zinc-600 transition-all text-base font-medium [&_.ant-input]:!bg-transparent [&_.ant-input]:!text-zinc-100 [&_.ant-input-password-icon]:!text-zinc-400 [&_.ant-input-affix-wrapper]:!bg-zinc-950/40 [&_.ant-input-affix-wrapper]:!border-zinc-800 [&_.ant-input-affix-wrapper-focused]:!border-zinc-700 [&_.ant-input-affix-wrapper-focused]:!bg-zinc-950/70 [&_.ant-input-affix-wrapper]:hover:!border-zinc-700"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-3">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="h-13 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-extrabold uppercase tracking-wider border-none shadow-[0_6px_20px_-4px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </Button>
            </div>
          </form>

          <Divider className="my-5 border-zinc-800/80">
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-[0.25em]">
              Or Continue With
            </span>
          </Divider>

          <Button
            className="w-full h-13 rounded-xl flex items-center justify-center gap-3 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/85 transition-all font-semibold text-sm text-zinc-300 bg-zinc-950/30"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <FcGoogle size={20} />
            <span>Google Account</span>
          </Button>
        </Card>

        <p className="text-center mt-8 text-zinc-500 text-[10px] font-bold tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Developed by{" "}
          <a
            href="https://vx9studio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white transition-colors underline"
          >
            VX9Studio
          </a>
        </p>
      </div>
    </div>
  );
}
