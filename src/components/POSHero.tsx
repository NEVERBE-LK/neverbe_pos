import React, { useState, useEffect, useCallback } from "react";
import { Input, Tooltip } from "antd";
import {
  IconSearch,
  IconReceipt,
  IconSettings,
  IconRefresh,
  IconArrowsExchange,
  IconLogout,
  IconCash,
  IconMapPin,
  IconTruck,
  IconBell,
} from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import POSInvoiceDialog from "./POSInvoiceDialog";
import POSSettingsDialog from "./POSSettingsDialog";
import POSExchangeDialog from "./POSExchangeDialog";
import POSPettyCashDialog from "./POSPettyCashDialog";
import POSOnlineOrdersDialog from "./POSOnlineOrdersDialog";
import POSNotificationDrawer from "./POSNotificationDrawer";
import { usePOSNotifications } from "../hooks/usePOSNotifications";
import { signOut } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseClient";
import { collection, query as firestoreQuery, where, onSnapshot } from "firebase/firestore";
import api from "@/lib/api";
import toast from "react-hot-toast";
import POSCredentialVerifyAndRequestAuthorizeForm from "./POSCredentialVerifyAndRequestAuthorizeForm";
import BrandLogo from "./BrandLogo";

export default function POSHero() {
  const {
    selectedStockId,
    stocks,
    openStockDialog,
    searchProducts,
    loadProducts,
    isOnline,
    offlineQueue,
  } = usePOS();

  const currentStock = stocks?.find?.((s) => s.id === selectedStockId);

  const [query, setQuery] = useState("");
  const [showInvoicesForm, setShowInvoicesForm] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [showPettyCashDialog, setShowPettyCashDialog] = useState(false);
  const [showOnlineOrdersDialog, setShowOnlineOrdersDialog] = useState(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [processingOrdersCount, setProcessingOrdersCount] = useState<number>(0);

  const fetchProcessingOrdersCount = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/pos/orders/processing-count");
      if (typeof res.data?.count === "number") {
        setProcessingOrdersCount(res.data.count);
        return;
      }
    } catch {
      try {
        const erpRes = await api.get("/api/v1/erp/orders", {
          params: { status: "Processing", from: "Website", page: 1, limit: 1 },
        });
        const total = erpRes.data?.total ?? (erpRes.data?.dataList?.length || 0);
        setProcessingOrdersCount(total);
      } catch (err) {
        console.debug("[POSHero] Failed to fetch processing orders count", err);
      }
    }
  }, []);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = usePOSNotifications(() => {
    fetchProcessingOrdersCount();
  });

  useEffect(() => {
    fetchProcessingOrdersCount();
    const interval = setInterval(fetchProcessingOrdersCount, 30000);

    let unsubscribe = () => {};
    try {
      if (db) {
        const q = firestoreQuery(
          collection(db, "orders"),
          where("from", "==", "Website"),
          where("status", "==", "Processing")
        );
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            setProcessingOrdersCount(snap.size);
          },
          (err) => {
            console.debug("[POSHero] Firestore orders listener fallback to polling:", err.message);
          }
        );
      }
    } catch (err) {
      console.debug("[POSHero] Firestore setup error:", err);
    }

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchProcessingOrdersCount]);

  const handleOpenOrderFromNotification = (orderId: string) => {
    setTargetOrderId(orderId);
    setShowOnlineOrdersDialog(true);
  };

  // Verification gate state
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyPermission, setVerifyPermission] = useState<string>("");
  const [verifyTitle, setVerifyTitle] = useState("");
  const [verifyDescription, setVerifyDescription] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestVerify = (
    permission: string,
    title: string,
    description: string,
    onSuccess: () => void
  ) => {
    setVerifyPermission(permission);
    setVerifyTitle(title);
    setVerifyDescription(description);
    setPendingAction(() => onSuccess);
    setVerifyOpen(true);
  };

  const handleVerifySuccess = () => {
    setVerifyOpen(false);
    if (pendingAction) pendingAction();
    setPendingAction(null);
  };

  const handleVerifyCancel = () => {
    setVerifyOpen(false);
    setPendingAction(null);
  };

  const handleLocationClick = () => {
    // Skip verification on first setup (no stock selected yet)
    const hasInitialSetup = typeof window !== "undefined" && !!window.localStorage.getItem("neverbePOSStockId");
    if (!hasInitialSetup) {
      openStockDialog();
      return;
    }
    requestVerify(
      "change_pos_location",
      "Verify Location Change",
      "Changing stock location requires security clearance. Please enter your password.",
      () => openStockDialog()
    );
  };

  const handlePettyCashClick = () => {
    requestVerify(
      "create_pos_pretty_cash",
      "Verify Petty Cash Access",
      "Accessing petty cash management requires security clearance. Please enter your password.",
      () => setShowPettyCashDialog(true)
    );
  };

  const handleOnlineOrdersClick = () => {
    const role = (localStorage.getItem("neverbePOSUserRole") || "").toLowerCase();
    const permsRaw = localStorage.getItem("neverbePOSUserPermissions");
    const permissions: string[] = permsRaw ? JSON.parse(permsRaw) : [];
    const isAllowed = role === "admin" || permissions.includes("process_online_orders");

    if (isAllowed) {
      setShowOnlineOrdersDialog(true);
    } else {
      requestVerify(
        "process_online_orders",
        "Verify Online Orders Access",
        "Processing online orders requires security clearance ('process_online_orders'). Please enter authorized credentials.",
        () => setShowOnlineOrdersDialog(true)
      );
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId) return;

    if (query.trim()) {
      searchProducts(query);
    } else {
      loadProducts(selectedStockId);
    }
  };

  const handleRefresh = () => {
    if (selectedStockId) {
      loadProducts(selectedStockId);
      setQuery("");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Top Header Row with Brand & Status */}
        <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white rounded-2xl shadow-sm border border-neutral-200/80">
          {/* Brand Logo & Location */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-0.5">
            <div className="flex items-center pr-3 border-r border-neutral-200">
              <BrandLogo className="h-6 w-auto text-black shrink-0" />
            </div>

            {/* Location Pill */}
            <div
              className="flex items-center gap-2 px-3.5 h-11 rounded-xl bg-neutral-950 text-white cursor-pointer transition-all duration-200 hover:bg-neutral-800 shadow-sm shrink-0 group"
              onClick={handleLocationClick}
              role="button"
              tabIndex={0}
              aria-label="Change Stock Location"
            >
              <IconMapPin size={16} className="text-zinc-400 group-hover:text-white shrink-0 transition-colors" />
              <span className="text-xs font-black uppercase text-white truncate max-w-[200px]">
                {currentStock?.label || currentStock?.name || "Select Stock"}
              </span>
            </div>

            {/* Connection Status Indicator */}
            <div
              className={`flex items-center gap-2 px-3.5 h-11 rounded-xl border text-[11px] font-bold uppercase tracking-wider justify-center select-none shrink-0 ${
                isOnline
                  ? "bg-neutral-100 text-neutral-800 border-neutral-200"
                  : "bg-amber-50 text-amber-800 border-amber-200 animate-pulse"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span>{isOnline ? "Online" : `Offline (${offlineQueue?.length || 0})`}</span>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 -my-2 px-1">
            <Tooltip title="Item Exchange">
              <button
                type="button"
                onClick={() => setShowExchangeDialog(true)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-black text-neutral-700 hover:text-white border border-neutral-200 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer"
                aria-label="Exchange"
              >
                <IconArrowsExchange size={20} />
              </button>
            </Tooltip>
            <Tooltip title="Invoices">
              <button
                type="button"
                onClick={() => setShowInvoicesForm(true)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-black text-neutral-700 hover:text-white border border-neutral-200 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer"
                aria-label="Invoices"
              >
                <IconReceipt size={20} />
              </button>
            </Tooltip>
            <Tooltip title={`Orders Processing${processingOrdersCount > 0 ? ` (${processingOrdersCount} pending)` : ""}`}>
              <button
                type="button"
                onClick={handleOnlineOrdersClick}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-black text-neutral-700 hover:text-white border border-neutral-200 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer relative"
                aria-label="Orders Processing"
              >
                <IconTruck size={20} />
                {processingOrdersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-black text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white font-mono shadow-xs z-10">
                    {processingOrdersCount > 9 ? "9+" : processingOrdersCount}
                  </span>
                )}
              </button>
            </Tooltip>
            <Tooltip title={`Order Alerts (${unreadCount} unread)`}>
              <button
                type="button"
                onClick={() => setShowNotificationsDrawer(true)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-black text-neutral-700 hover:text-white border border-neutral-200 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer relative"
                aria-label="Order Alerts"
              >
                <IconBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white font-mono animate-pulse z-10 shadow-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </Tooltip>
            <Tooltip title="Petty Cash">
              <button
                type="button"
                onClick={handlePettyCashClick}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-black text-neutral-700 hover:text-white border border-neutral-200 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer"
                aria-label="Petty Cash"
              >
                <IconCash size={20} />
              </button>
            </Tooltip>
            <Tooltip title="Settings">
              <button
                type="button"
                onClick={() => setShowSettingsDialog(true)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 hover:bg-black text-neutral-700 hover:text-white border border-neutral-200 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer"
                aria-label="Settings"
              >
                <IconSettings size={20} />
              </button>
            </Tooltip>
            <Tooltip title="Logout">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200/80 hover:border-red-600 transition-all duration-200 shadow-xs hover:shadow-md shrink-0 cursor-pointer"
                aria-label="Logout"
              >
                <IconLogout size={20} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Search & Refresh Row */}
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-200/80">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 w-full">
            <Input
              size="large"
              placeholder="Search products by name, brand, or SKU..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              prefix={<IconSearch size={20} className="text-zinc-400 mr-2 shrink-0" />}
              className="flex-1 font-semibold text-base rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white focus:border-black hover:bg-white h-12"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-7 h-12 bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer active:scale-98"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 transition-all duration-200 shadow-xs cursor-pointer active:scale-95"
                title="Refresh Product Catalog"
                aria-label="Refresh Catalog"
              >
                <IconRefresh size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Action Dialogs */}
      <POSOnlineOrdersDialog
        open={showOnlineOrdersDialog}
        onClose={() => {
          setShowOnlineOrdersDialog(false);
          setTargetOrderId(null);
          fetchProcessingOrdersCount();
        }}
        selectedStockId={selectedStockId}
        initialOrderId={targetOrderId}
        onOrderProcessed={() => {
          setProcessingOrdersCount((prev) => Math.max(0, prev - 1));
          fetchProcessingOrdersCount();
        }}
      />
      <POSNotificationDrawer
        open={showNotificationsDrawer}
        onClose={() => setShowNotificationsDrawer(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onOpenOrder={handleOpenOrderFromNotification}
      />
      <POSInvoiceDialog open={showInvoicesForm} onClose={() => setShowInvoicesForm(false)} />
      <POSSettingsDialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} />
      <POSExchangeDialog open={showExchangeDialog} onClose={() => setShowExchangeDialog(false)} />
      <POSPettyCashDialog open={showPettyCashDialog} onClose={() => setShowPettyCashDialog(false)} />
      <POSCredentialVerifyAndRequestAuthorizeForm
        open={verifyOpen}
        onCancel={handleVerifyCancel}
        onSuccess={handleVerifySuccess}
        title={verifyTitle}
        description={verifyDescription}
        requiredPermission={verifyPermission}
      />
    </>
  );
}
