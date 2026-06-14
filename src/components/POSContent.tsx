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
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-gray-50 overflow-auto lg:overflow-hidden">
      {/* Main Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 lg:min-h-0 lg:overflow-hidden relative">
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-150/70 py-3.5 px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-bold text-gray-400 tracking-widest uppercase z-10 shrink-0">
        <span>&copy; {new Date().getFullYear()} Neverbe POS</span>
        <span>
          Developed by{" "}
          <a
            href="https://vx9studio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-650 hover:text-black hover:underline transition-all"
          >
            VX9Studio
          </a>
        </span>
      </footer>
    </div>
  );
}
