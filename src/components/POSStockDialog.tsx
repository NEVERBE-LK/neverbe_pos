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
        width={400}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        footer={null}
        className="[&_.ant-modal-content]:rounded-2xl! [&_.ant-modal-content]:border-0! [&_.ant-modal-content]:shadow-xl! [&_.ant-modal-content]:p-0!"
      >
        {/* Header */}
        <div className="border-b border-gray-100 bg-gray-50/50 p-5 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">
            Select Stock Location
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose the store or warehouse to load inventory from
          </p>
        </div>

        {/* Content */}
        <div className="py-6 px-4">
          {isStocksLoading ? (
            <div className="flex justify-center items-center py-8">
              <Spin size="large" />
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-500 font-medium">
                No stock locations available
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Stock Location
              </label>
              <Select
                value={selectedStockId || undefined}
                onChange={handleChange}
                placeholder="Select location..."
                className="w-full font-medium h-12 text-base"
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
        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
          {selectedStockId && (
            <Button
              onClick={closeStockDialog}
              className="font-medium h-12 px-6 rounded-xl hover:bg-gray-100 border-transparent text-gray-600"
            >
              Cancel
            </Button>
          )}
          <Button
            type="primary"
            onClick={handleConfirm}
            disabled={!selectedStockId || isStocksLoading}
            className="font-semibold h-12 px-8 rounded-xl shadow-sm"
            style={{
              backgroundColor: selectedStockId ? "#16a34a" : undefined,
            }}
          >
            Continue
          </Button>
        </div>
      </Modal>
    </>
  );
}
