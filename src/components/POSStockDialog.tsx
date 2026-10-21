"use client";

import React, { useEffect, useState } from "react";
import { Modal, Select, Spin, Button } from "antd";
import { usePOS } from "../context/POSContext";
import toast from "react-hot-toast";
import POSCredentialVerifyAndRequestAuthorizeForm from "./POSCredentialVerifyAndRequestAuthorizeForm";

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
    openStockDialog,
  } = usePOS();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingStockId, setPendingStockId] = useState<string | null>(null);

  // Fetch stocks on mount
  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

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
        width={420}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        footer={null}
        className="[&_.ant-modal-content]:rounded-3xl! [&_.ant-modal-content]:border-0! [&_.ant-modal-content]:shadow-2xl! [&_.ant-modal-content]:p-0! overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-neutral-100 bg-neutral-900 text-white p-6">
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

        {/* Content */}
        <div className="py-6 px-6">
          {isStocksLoading ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" />
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-neutral-500 font-semibold text-xs uppercase tracking-wider">
                No stock locations available
              </p>
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
        <div className="flex justify-end gap-3 p-5 border-t border-neutral-100 bg-neutral-50/50 rounded-b-3xl">
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
            disabled={!selectedStockId || isStocksLoading}
            className="font-black h-12 px-8 rounded-xl shadow-md text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 transition-all"
          >
            Confirm Location
          </Button>
        </div>
      </Modal>
    </>
  );
}
