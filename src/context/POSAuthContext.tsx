import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import api from "@/lib/api";
import { Spin } from "antd";
import toast from "react-hot-toast";

interface POSAuthContextType {
  currentUser: User | null;
  isLoading: boolean;
}

const POSAuthContext = createContext<POSAuthContextType>({
  currentUser: null,
  isLoading: true,
});

export const usePOSAuth = () => useContext(POSAuthContext);

export const POSAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoading(true);

        try {
          const token = await user.getIdToken();
          const formData = new FormData();
          formData.append("data", JSON.stringify({ uid: user.uid }));

          const response = await api.post(
            "/api/v1/auth/login",
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.status === 200 && response.data) {
            const userData = response.data as any;
            const role = (userData.role || "").toLowerCase();
            const permissions: string[] = userData.permissions || [];
            const hasPosAccess =
              role === "admin" || permissions.includes("access_pos");

            if (!hasPosAccess) {
              console.warn(
                `[POSAuth] User ${user.email} (role: ${role || "none"}) lacks 'access_pos' permission. Rejecting session.`
              );
              toast.error(
                "Access Denied: This account is not authorized to access the POS terminal."
              );
              await signOut(auth);
              localStorage.removeItem("neverbePOSUserRole");
              localStorage.removeItem("neverbePOSUserPermissions");
              localStorage.removeItem("neverbePOSStockId");
              localStorage.removeItem("neverbePOSCachedStocks");
              setCurrentUser(null);
              setIsLoading(false);
              return;
            }

            // Successfully authenticated and verified for POS
            setCurrentUser(userData);
            localStorage.setItem("neverbePOSUserRole", role);
            localStorage.setItem(
              "neverbePOSUserPermissions",
              JSON.stringify(permissions)
            );
            setIsLoading(false);
          } else {
            console.error("Backend login rejected the user.");
            toast.error(
              "Access Denied: You do not have permissions to access POS."
            );
            await signOut(auth);
            localStorage.removeItem("neverbePOSUserRole");
            localStorage.removeItem("neverbePOSUserPermissions");
            localStorage.removeItem("neverbePOSStockId");
            localStorage.removeItem("neverbePOSCachedStocks");
            setCurrentUser(null);
            setIsLoading(false);
          }
        } catch (err: unknown) {
          const error = err as any;
          const status = error?.status || error?.response?.status;
          console.error("[POSAuth] Backend auth verification failed:", error);

          if (
            status === 401 ||
            status === 403 ||
            error?.message?.includes("401") ||
            error?.message?.includes("403") ||
            error?.message?.toLowerCase().includes("unauthorized") ||
            error?.message?.toLowerCase().includes("forbidden")
          ) {
            toast.error(
              "Access Denied: This account is not authorized to access POS."
            );
            await signOut(auth);
            localStorage.removeItem("neverbePOSUserRole");
            localStorage.removeItem("neverbePOSUserPermissions");
            localStorage.removeItem("neverbePOSStockId");
            localStorage.removeItem("neverbePOSCachedStocks");
            setCurrentUser(null);
            setIsLoading(false);
          } else if (!navigator.onLine) {
            // Offline fallback: Check if previously authorized
            const cachedRole = (
              localStorage.getItem("neverbePOSUserRole") || ""
            ).toLowerCase();
            const permsRaw = localStorage.getItem("neverbePOSUserPermissions");
            const cachedPerms: string[] = permsRaw ? JSON.parse(permsRaw) : [];
            const wasAllowed =
              cachedRole === "admin" || cachedPerms.includes("access_pos");

            if (wasAllowed) {
              setCurrentUser(user);
              setIsLoading(false);
            } else {
              toast.error(
                "Unauthorized: Lacking verified offline POS permissions."
              );
              await signOut(auth);
              setCurrentUser(null);
              setIsLoading(false);
            }
          } else {
            // Other server error
            toast.error("Failed to authenticate session with backend.");
            await signOut(auth);
            setCurrentUser(null);
            setIsLoading(false);
          }
        }
      } else {
        setCurrentUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#080908] text-white">
        <Spin size="large" />
        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
          Verifying POS Security Clearance...
        </p>
      </div>
    );
  }

  return (
    <POSAuthContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </POSAuthContext.Provider>
  );
};
