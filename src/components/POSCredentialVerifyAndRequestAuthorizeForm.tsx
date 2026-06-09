import React, { useState } from "react";
import { Modal, Input, Button } from "antd";
import { IconLock } from "@tabler/icons-react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";

interface POSCredentialVerifyAndRequestAuthorizeFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  requiredPermission?: string;
}

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
  description = "Please enter your password to authorize this action.",
  requiredPermission,
}: POSCredentialVerifyAndRequestAuthorizeFormProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const isOnline = navigator.onLine;

      if (isOnline && user && user.email) {
        // Online: verify with Firebase Auth
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        
        // Retrieve custom claims to verify the role
        const tokenResult = await user.getIdTokenResult(true);
        const role = (tokenResult.claims.role as string || "").toLowerCase();
        
        // Retrieve permissions
        const cachedPermsRaw = localStorage.getItem("neverbePOSUserPermissions");
        const permissions: string[] = cachedPermsRaw ? JSON.parse(cachedPermsRaw) : [];
        
        const hasPermission = role === "admin" || (requiredPermission ? permissions.includes(requiredPermission) : false);
        
        if (role !== "admin" && requiredPermission && !hasPermission) {
          throw new Error(`Unauthorized: You lack the required permission '${requiredPermission}' to authorize this action.`);
        }
        
        // Update local hash cache for future offline verification
        const hashHex = await hashPassword(password);
        localStorage.setItem("neverbePOSUserPassHash", hashHex);
        localStorage.setItem("neverbePOSUserRole", role);
        
        toast.success("Verification successful!");
        setPassword("");
        onSuccess();
      } else {
        // Offline: verify against local SHA-256 hash and cached role/permissions
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
      toast.error(error.message || "Incorrect password. Verification failed.");
    } finally {
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
      width={400}
      title={null}
      zIndex={3000}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      <div className="border-b border-gray-100 bg-gray-50/50 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <IconLock size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Security Verification Required
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 font-medium">
          {description}
        </p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
            Your Password
          </label>
          <Input.Password
            size="large"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 rounded-xl border-gray-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleVerify();
            }}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-50">
          <Button
            onClick={() => {
              setPassword("");
              onCancel();
            }}
            className="h-12 px-6 rounded-xl hover:bg-gray-100 border-transparent text-gray-600 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleVerify}
            className="h-12 px-8 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 border-none shadow-md shadow-amber-500/20"
          >
            Verify
          </Button>
        </div>
      </div>
    </Modal>
  );
}
