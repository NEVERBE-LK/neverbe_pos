"use client";

import { Spin } from "antd";
import POSHero from "./POSHero";
import POSProducts from "./POSProducts";
import POSInvoiceDetails from "./POSInvoiceDetails";
import POSPaymentForm from "./POSPaymentForm";
import POSStockDialog from "./POSStockDialog";
import { usePOS } from "../context/POSContext";
export default function POSContent() {
  const { isProductsLoading } = usePOS();

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-screen lg:h-screen w-full p-4 lg:p-6 bg-gray-50 lg:overflow-hidden relative">
      {/* Left Panel - Products */}
      <div className="flex-[1.5] flex flex-col gap-2 h-auto lg:h-full transition-all duration-300">
        <POSHero />
        {isProductsLoading ? (
          <div className="flex justify-center items-center flex-1 min-h-[400px]">
            <Spin size="large" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col max-h-[60vh] lg:max-h-none lg:min-h-0 overflow-hidden">
            <POSProducts />
          </div>
        )}
      </div>

      {/* Right Panel - Invoice Details */}
      <div className="flex-1 flex flex-col h-auto lg:h-full transition-all duration-300">
        <POSInvoiceDetails />
      </div>

      {/* Dialogs */}
      <POSStockDialog />
      <POSPaymentForm />
    </div>
  );
}
