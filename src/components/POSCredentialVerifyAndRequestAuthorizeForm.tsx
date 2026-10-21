import React, { useState, useEffect } from "react";
import { Modal, Input, Button } from "antd";
import { IconLock, IconMail } from "@tabler/icons-react";
import { auth } from "@/firebase/firebaseClient";
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface POSCredentialVerifyAndRequestAuthorizeFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  requiredPermission?: string;
}

// Config for secondary firebase app, aligned with firebaseClient.ts configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export default function POSCredentialVerifyAndRequestAuthorizeForm({
  open,
  onCancel,
  onSuccess,
  title = "Verify Admin Credentials",
  description = "Please enter admin/authorized user credentials to authorize this action.",
  requiredPermission,
}: POSCredentialVerifyAndRequestAuthorizeFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear fields when modal opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
    }
  }, [open]);

  const handleVerify = async () => {
    if (!email) {
      toast.error("Please enter email address");
      return;
    }
    if (!password) {
      toast.error("Please enter password");
      return;
    }

    setLoading(true);
    let secondaryApp;
    try {
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Initialize a secondary Firebase client instance
        // This allows us to authenticate the supervisor's credentials without logging out the primary session
        const appName = `verify-app-${Date.now()}`;
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        // Sign in via secondary instance to obtain verification token
        const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, password);
        const token = await userCredential.user.getIdToken();

        // Send token to the backend API which verifies it using Firebase Admin SDK
        const response = await api.post("/api/v1/pos/auth/verify", {
          token,
          requiredPermission,
        });

        if (response.data && response.data.success) {
          toast.success("Verification successful!");
          setPassword("");
          onSuccess();
        } else {
          throw new Error(response.data?.message || "Verification failed");
        }
      } else {
        // Offline: fallback to local SHA-256 hash check of current logged-in user if email matches
        const currentUserEmail = auth.currentUser?.email || "";
        if (email.toLowerCase() !== currentUserEmail.toLowerCase()) {
          throw new Error("Offline authorization only supports the current logged-in user.");
        }

        const cachedHash = localStorage.getItem("neverbePOSUserPassHash");
        const cachedRole = localStorage.getItem("neverbePOSUserRole") || "";
        const cachedPermsRaw = localStorage.getItem("neverbePOSUserPermissions");
        const permissions: string[] = cachedPermsRaw ? JSON.parse(cachedPermsRaw) : [];
        
        if (!cachedHash) {
          throw new Error("No offline password cache found. Please connect to the internet to verify.");
        }
        
        const role = cachedRole.toLowerCase();
        const hasPermission = role === "admin" || (requiredPermission ? permissions.includes(requiredPermission) : false);

        if (role !== "admin" && requiredPermission && !hasPermission) {
          throw new Error(`Unauthorized: You lack the required permission '${requiredPermission}' to authorize this action.`);
        }

        const inputHash = await hashPassword(password);
        if (inputHash === cachedHash) {
          toast.success("Verification successful (Offline)!");
          setPassword("");
          onSuccess();
        } else {
          throw new Error("Incorrect password");
        }
      }
    } catch (error: any) {
      console.error("Verification failed:", error);
      const friendlyMsg = error.response?.data?.message || error.message || "Verification failed.";
      toast.error(friendlyMsg);
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.error("Failed to delete secondary app instance:", e);
        }
      }
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        setPassword("");
        onCancel();
      }}
      footer={null}
      width="min(500px, 95vw)"
      centered
      title={null}
      zIndex={3000}
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!p-0 overflow-hidden shadow-2xl"
    >
      <div className="border-b border-neutral-800 bg-neutral-950 text-white px-6 py-5 rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-white">
            <IconLock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-0.5 font-mono">
              CLEARANCE OVERRIDE
            </span>
            <h3 className="text-lg font-black text-white leading-tight">
              {title}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-h-[calc(86vh-120px)] overflow-y-auto">
        <p className="text-xs text-neutral-500 font-medium leading-relaxed">
          {description}
        </p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1 font-mono">
            Email Address
          </label>
          <Input
            size="large"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@neverbe.com"
            prefix={<IconMail size={18} className="text-neutral-400 mr-2" />}
            className="h-12 rounded-xl border-neutral-200 font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1 font-mono">
            Password
          </label>
          <Input.Password
            size="large"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 rounded-xl border-neutral-200 font-medium"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerify();
            }}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
          <Button
            onClick={() => {
              setPassword("");
              onCancel();
            }}
            className="h-11 px-6 rounded-xl hover:bg-neutral-100 border-transparent text-neutral-600 font-bold text-xs uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleVerify}
            className="h-11 px-8 rounded-xl font-black text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 border-none shadow-md"
          >
            Authorize
          </Button>
        </div>
      </div>
    </Modal>
  );
}
