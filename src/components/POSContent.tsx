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
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-[#f6f7f6] overflow-auto lg:overflow-hidden select-none font-sans">
      {/* Main Grid Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3.5 p-3 sm:p-4 lg:p-5 lg:min-h-0 lg:overflow-hidden relative">
        {/* Left Panel - Hero, Search & Catalog Grid */}
        <div className="flex-[1.55] flex flex-col gap-2.5 h-auto lg:h-full transition-all duration-200">
          <POSHero />
          {isProductsLoading ? (
            <div className="flex justify-center items-center flex-1 min-h-[360px] bg-white rounded-2xl border border-neutral-200/80">
              <Spin size="large" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col max-h-[60vh] lg:max-h-none lg:min-h-0 overflow-hidden">
              <POSProducts />
            </div>
          )}
        </div>

        {/* Right Panel - Order & Invoice Details */}
        <div className="flex-1 flex flex-col h-auto lg:h-full transition-all duration-200">
          <POSInvoiceDetails />
        </div>

        {/* Dialogs */}
        <POSStockDialog />
        <POSPaymentForm />
      </div>

      {/* Sportswear Minimal Sub-Footer */}
      <footer className="bg-white border-t border-neutral-200/80 py-2.5 px-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-extrabold text-zinc-400 tracking-widest uppercase z-10 shrink-0">
        <span className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} NEVERBE POS</span>
          <span className="text-zinc-300">·</span>
          <span>Delgoda Flagship Store</span>
        </span>
        <span>
          Secured Point of Sale Terminal · v2.0
        </span>
      </footer>
    </div>
  );
}
