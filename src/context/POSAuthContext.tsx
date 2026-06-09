import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
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
        // Tentative login: Set user immediately and stop loading to speed up UI transition
        setCurrentUser(user);
        setIsLoading(false);

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
            // Update with enriched user details from our backend
            const userData = response.data as any;
            setCurrentUser(userData);
            
            // Cache role and permissions in localStorage
            localStorage.setItem("neverbePOSUserRole", (userData.role || "").toLowerCase());
            localStorage.setItem("neverbePOSUserPermissions", JSON.stringify(userData.permissions || []));
          } else {
            console.error("Backend login rejected the user.");
            toast.error(
              "Unauthorized: You do not have permissions to access POS.",
            );
            await auth.signOut();
            setCurrentUser(null);
          }
        } catch (err: unknown) {
          const error = err as any;
          console.error("Failed to authenticate with backend:", error);

          // Only show error toast if they actually tried to log in or had a session
          if (
            error?.response?.status === 401 ||
            error?.response?.status === 403
          ) {
            toast.error(
              "Unauthorized: Invalid credentials or lacking POS permissions.",
            );
            await auth.signOut();
            setCurrentUser(null);
          }
          // If it's a network error or other, we keep the Firebase user for now
          // and let other components handle failed API calls gracefully.
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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <POSAuthContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </POSAuthContext.Provider>
  );
};
