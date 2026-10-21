"use client";

import React, { useEffect, useState } from "react";
import { Modal, Select, Spin, Button } from "antd";
import { usePOS } from "../context/POSContext";
import toast from "react-hot-toast";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import { IconLogout, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

export default function POSStockDialog() {
  const {
    stocks,
    selectedStockId,
    showStockDialog,
    isStocksLoading,
    loadStocks,
    selectStock,
    loadProducts,
    closeStockDialog,
  } = usePOS();

  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch stocks on mount
  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("neverbePOSStockId");
        window.localStorage.removeItem("neverbePOSUserRole");
        window.localStorage.removeItem("neverbePOSUserPermissions");
        window.localStorage.removeItem("neverbePOSCachedStocks");
      }
      closeStockDialog();
      toast.success("Logged out successfully");
    } catch (err: any) {
      console.error("Logout error:", err);
      toast.error("Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedStockId) {
      toast.error("Please select a stock location");
      return;
    }

    // Save to localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("neverbePOSStockId", selectedStockId);
    }

    // Fetch products for selected stock
    loadProducts(selectedStockId);
    closeStockDialog();
    toast.success("Stock location selected");
  };

  const handleChange = (value: string) => {
    selectStock(value);
  };

  return (
    <>
      <Modal
        open={showStockDialog}
        width={440}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        footer={null}
        className="[&_.ant-modal-content]:rounded-3xl! [&_.ant-modal-content]:border-0! [&_.ant-modal-content]:shadow-2xl! [&_.ant-modal-content]:p-0! overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-neutral-800 bg-neutral-950 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-1">
                LOCATION CHECKPOINT
              </span>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                Select Stock Location
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">
                Choose the store or warehouse terminal to load inventory from.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/90 hover:bg-red-600 text-neutral-300 hover:text-white transition-all duration-200 text-[10px] font-black uppercase tracking-wider font-mono cursor-pointer shrink-0 border border-neutral-700/60 hover:border-red-600 shadow-sm"
              title="Sign out of current account"
            >
              <IconLogout size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="py-6 px-6">
          {isStocksLoading ? (
            <div className="flex flex-col justify-center items-center py-8">
              <Spin size="large" />
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                Loading Locations...
              </p>
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
                <IconAlertTriangle size={24} />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-neutral-900 font-mono">
                No Stock Locations Available
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-[280px] leading-relaxed">
                Unable to load locations. Your account may not be authorized for POS or session has expired.
              </p>
              <div className="flex items-center gap-2 mt-5 w-full justify-center">
                <Button
                  icon={<IconRefresh size={14} />}
                  onClick={() => loadStocks()}
                  className="font-bold text-xs uppercase tracking-wider rounded-xl h-10 px-4"
                >
                  Retry
                </Button>
                <Button
                  danger
                  type="primary"
                  icon={<IconLogout size={14} />}
                  onClick={handleLogout}
                  loading={loggingOut}
                  className="font-black text-xs uppercase tracking-wider rounded-xl h-10 px-5 !bg-red-600 hover:!bg-red-700 shadow-sm"
                >
                  Log Out
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-[0.15em] mb-2.5">
                Terminal Stock Location
              </label>
              <Select
                value={selectedStockId || undefined}
                onChange={handleChange}
                placeholder="Select location..."
                className="w-full font-bold h-12 text-sm [&_.ant-select-selector]:!rounded-xl"
                size="large"
                options={stocks.map((stock) => ({
                  value: stock.id,
                  label: stock.label || stock.name,
                }))}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-5 border-t border-neutral-100 bg-neutral-50/50 rounded-b-3xl">
          <Button
            type="text"
            danger
            icon={<IconLogout size={15} />}
            onClick={handleLogout}
            loading={loggingOut}
            className="font-black text-[11px] uppercase tracking-wider rounded-xl hover:bg-red-50 text-red-600"
          >
            Log Out
          </Button>
          <div className="flex items-center gap-2.5">
            {selectedStockId && (
              <Button
                onClick={closeStockDialog}
                className="font-bold h-12 px-6 rounded-xl hover:bg-neutral-200/70 border-transparent text-neutral-600 text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
            )}
            <Button
              type="primary"
              onClick={handleConfirm}
              disabled={!selectedStockId || isStocksLoading || stocks.length === 0}
              className="font-black h-12 px-8 rounded-xl shadow-md text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 transition-all"
            >
              Confirm Location
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
