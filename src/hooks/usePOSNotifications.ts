import { useEffect, useState, useRef, useCallback } from "react";
import { db, auth } from "@/firebase/firebaseClient";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { playNotificationChime } from "@/utils/audioChime";

export interface POSNotification {
  id: string;
  type: "ORDER" | "STOCK" | "SYSTEM";
  title: string;
  message: string;
  metadata?: {
    orderId?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    paymentMethodId?: string;
    status?: string;
    total?: number;
    customerName?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: any;
}

export const isOrderAlertEligible = (n: Partial<POSNotification>) => {
  if (n.type !== "ORDER") return true;
  const meta = n.metadata || {};
  const title = (n.title || "").toLowerCase();
  const body = (n.message || "").toLowerCase();

  const paymentStatus = (meta.paymentStatus || "").toLowerCase();
  const paymentMethod = (meta.paymentMethod || "").toLowerCase();
  const paymentMethodId = (meta.paymentMethodId || "").toUpperCase();

  // 1. Explicitly failed payments or cancellations are NEVER eligible
  if (
    paymentStatus === "failed" ||
    title.includes("failed") ||
    body.includes("failed") ||
    paymentStatus === "cancelled" ||
    title.includes("cancelled")
  ) {
    return false;
  }

  // 2. Identify COD orders (Cash On Delivery)
  const isCod =
    paymentMethod === "cod" ||
    paymentMethodId === "PM-001" ||
    paymentMethod.includes("cash on delivery") ||
    title.includes("cod") ||
    body.includes("cash on delivery");

  // 3. Identify Paid orders
  const isPaid =
    paymentStatus === "paid" ||
    paymentStatus === "completed" ||
    title.includes("paid") ||
    body.includes("paid");

  // 4. Online Gateways (PayHere, Koko, Card, etc.) MUST be Paid. Non-paid are strictly suppressed!
  const isOnlineGateway =
    paymentMethod.includes("payhere") ||
    paymentMethod.includes("koko") ||
    paymentMethod.includes("card") ||
    paymentMethod.includes("online") ||
    paymentMethodId === "PM-002" ||
    paymentMethodId === "PM-003" ||
    paymentMethodId === "PM-006" ||
    title.includes("payhere") ||
    title.includes("koko") ||
    body.includes("payhere") ||
    body.includes("koko");

  if (isOnlineGateway) {
    return isPaid;
  }

  // 5. If paymentStatus is explicitly Pending and not COD: Suppress
  if (paymentStatus === "pending" && !isCod) {
    return false;
  }

  // 6. Confirmed targets: COD orders OR Paid online orders
  return isCod || isPaid;
};

export const usePOSNotifications = (onNewOrderAlert?: (item: POSNotification) => void) => {
  const [notifications, setNotifications] = useState<POSNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const initialLoadRef = useRef(true);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const notifRef = doc(db, "erp_notifications", id);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.debug("[usePOSNotifications] Failed to update read status:", err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadList = notifications.filter((n) => !n.read);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      await Promise.allSettled(
        unreadList.map((n) => {
          const notifRef = doc(db, "erp_notifications", n.id);
          return updateDoc(notifRef, { read: true });
        })
      );
      toast.success("All notifications marked as read");
    } catch (err) {
      console.debug("[usePOSNotifications] Failed to mark all as read:", err);
    }
  }, [notifications]);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, "erp_notifications"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!initialLoadRef.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const item = {
                id: change.doc.id,
                ...change.doc.data(),
              } as POSNotification;

              if (isOrderAlertEligible(item)) {
                // Play notification chime
                playNotificationChime();

                // Surface toast notification
                const paymentLabel =
                  (item.metadata?.paymentMethod || "").toLowerCase().includes("cod") ||
                  (item.metadata?.paymentMethodId || "") === "PM-001"
                    ? "COD"
                    : "Paid Online";

                toast.success(
                  `${item.title} (${paymentLabel}): ${item.message}`,
                  {
                    icon: "🔔",
                    duration: 6000,
                  }
                );

                if (onNewOrderAlert) {
                  onNewOrderAlert(item);
                }
              }
            }
          });
        } else {
          initialLoadRef.current = false;
        }

        const rawDocs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as POSNotification[];

        const eligible = rawDocs.filter(isOrderAlertEligible);
        setNotifications(eligible);
        setUnreadCount(eligible.filter((n) => !n.read).length);
      },
      (error) => {
        console.warn("[usePOSNotifications] Firestore listener error:", error.message || error);
      }
    );

    return () => unsubscribe();
  }, [onNewOrderAlert]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
