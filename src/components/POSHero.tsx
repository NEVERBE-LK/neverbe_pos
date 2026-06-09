import React, { useState } from "react";
import { Input, Tooltip } from "antd";
import {
  IconSearch,
  IconReceipt,
  IconSettings,
  IconRefresh,
  IconArrowsExchange,
  IconLogout,
  IconCash,
} from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import POSInvoiceDialog from "./POSInvoiceDialog";
import POSSettingsDialog from "./POSSettingsDialog";
import POSExchangeDialog from "./POSExchangeDialog";
import POSPettyCashDialog from "./POSPettyCashDialog";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import toast from "react-hot-toast";

export default function POSHero() {
  const {
    selectedStockId,
    stocks,
    openStockDialog,
    searchProducts,
    loadProducts,
    isOnline,
    offlineQueue,
    todayOrdersCount,
  } = usePOS();

  const currentStock = stocks?.find?.((s) => s.id === selectedStockId);

  const [query, setQuery] = useState("");
  const [showInvoicesForm, setShowInvoicesForm] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [showPettyCashDialog, setShowPettyCashDialog] = useState(false);

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
      <div className="flex flex-col gap-4">
        {/* Top Header Row */}
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className="flex items-center gap-2 px-5 h-12 rounded-xl bg-green-50 border border-green-100 cursor-pointer transition-all duration-200 hover:bg-green-600 hover:text-white group w-full sm:w-auto justify-center sm:justify-start"
              onClick={openStockDialog}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-green-700 group-hover:text-green-100">
                Location:
              </span>
              <span className="text-sm font-extrabold uppercase text-green-900 group-hover:text-white truncate max-w-[200px]">
                {currentStock?.label || currentStock?.name || "Select Stock"}
              </span>
            </div>

            {/* Connection Status Indicator */}
            <div className={`flex items-center gap-2 px-4 h-12 rounded-xl border font-bold text-xs uppercase tracking-wide justify-center select-none ${
              isOnline 
                ? "bg-green-50 text-green-700 border-green-100" 
                : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-500"}`} />
              <span>{isOnline ? "Online" : `Offline (${offlineQueue?.length || 0})`}</span>
            </div>

            {/* Today's Orders Count Badge */}
            {selectedStockId && (
              <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs uppercase tracking-wide justify-center select-none">
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Today's Orders:
                </span>
                <span className="text-sm font-extrabold text-blue-900">
                  {todayOrdersCount}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions (Right side) */}
          <div className="flex gap-3 w-full sm:w-auto justify-center">
            <Tooltip title="Item Exchange">
              <button
                onClick={() => setShowExchangeDialog(true)}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 border border-gray-200 transition-all shadow-sm hover:shadow-md"
              >
                <IconArrowsExchange size={22} />
              </button>
            </Tooltip>
            <Tooltip title="Invoices">
              <button
                onClick={() => setShowInvoicesForm(true)}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 border border-gray-200 transition-all shadow-sm hover:shadow-md"
              >
                <IconReceipt size={22} />
              </button>
            </Tooltip>
            <Tooltip title="Petty Cash">
              <button
                onClick={() => setShowPettyCashDialog(true)}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 border border-gray-200 transition-all shadow-sm hover:shadow-md"
              >
                <IconCash size={22} />
              </button>
            </Tooltip>
            <Tooltip title="Settings">
              <button
                onClick={() => setShowSettingsDialog(true)}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 border border-gray-200 transition-all shadow-sm hover:shadow-md"
              >
                <IconSettings size={22} />
              </button>
            </Tooltip>
            <Tooltip title="Logout">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 hover:bg-red-600 text-red-500 hover:text-white border border-red-100 hover:border-red-600 transition-all shadow-sm hover:shadow-md"
              >
                <IconLogout size={22} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Search & Refresh Row */}
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 w-full"
          >
            <Input
              size="large"
              placeholder="Search products by name or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              prefix={<IconSearch size={22} className="text-gray-400 mr-2" />}
              className="flex-1 font-medium text-lg rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-green-600 hover:bg-white h-14"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 sm:flex-none items-center justify-center px-8 h-14 bg-green-600 text-white font-bold text-base rounded-xl transition-all hover:bg-green-700 shadow-sm hover:shadow-md"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-all shadow-sm hover:shadow-md"
              >
                <IconRefresh size={22} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Action Dialogs */}
      <POSInvoiceDialog
        open={showInvoicesForm}
        onClose={() => setShowInvoicesForm(false)}
      />
      <POSSettingsDialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />
      <POSExchangeDialog
        open={showExchangeDialog}
        onClose={() => setShowExchangeDialog(false)}
      />
      <POSPettyCashDialog
        open={showPettyCashDialog}
        onClose={() => setShowPettyCashDialog(false)}
      />
    </>
  );
}
