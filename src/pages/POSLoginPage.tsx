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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative font-['Inter', sans-serif]">
      {/* Existing POS Theme Input Styles */}
      <style>{`
        .premium-input .ant-input-prefix {
          color: #9ca3af !important;
          margin-right: 10px !important;
        }
        .premium-input input {
          color: #1f2937 !important;
          font-weight: 500 !important;
        }
        .premium-input input::placeholder {
          color: #9ca3af !important;
        }
        .premium-input.ant-input-affix-wrapper:focus,
        .premium-input.ant-input-affix-wrapper-focused {
          border-color: #16a34a !important; /* Tailwind green-600 */
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1) !important;
        }
      `}</style>

      <div className="w-full max-w-[420px] z-10">
        {/* Main POS themed Card */}
        <div className="bg-white border border-gray-200/80 shadow-[0_16px_36px_rgba(0,0,0,0.03)] rounded-[24px] p-8 md:p-10">
          {/* Logo Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white border border-gray-100 rounded-2xl mb-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
              <img
                src="/logo.png"
                alt="Neverbe Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-[0.2em] uppercase mb-1">
              Neverbe
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              POS Terminal Login
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
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
                className="premium-input h-12 bg-white border-gray-200 hover:border-gray-300 transition-all rounded-xl text-base"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e5e7eb",
                  borderRadius: "12px",
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Password
              </label>
              <Input.Password
                size="large"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<IconLock size={18} />}
                placeholder="••••••••"
                className="premium-input h-12 bg-white border-gray-200 hover:border-gray-300 transition-all rounded-xl text-base"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e5e7eb",
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
                className="h-12 rounded-xl bg-black hover:bg-gray-800 text-white text-xs font-black uppercase tracking-widest border-none transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "AUTHENTICATING..." : "SIGN IN"}
              </Button>
            </div>
          </form>

          <div className="relative flex py-4 items-center my-4">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[9px] font-extrabold uppercase tracking-[0.25em]">
              OR SIGN IN WITH
            </span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <Button
            className="w-full h-12 rounded-xl flex items-center justify-center gap-3 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all font-bold text-xs uppercase tracking-widest text-gray-600 bg-white"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              backgroundColor: "#ffffff",
              borderColor: "#e5e7eb",
              borderRadius: "12px",
              color: "#4b5563",
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
