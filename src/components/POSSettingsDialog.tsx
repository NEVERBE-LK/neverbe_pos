import React, { useState } from "react";
import { Modal, Button } from "antd";
import {
  IconX,
  IconLogout,
  IconBuilding,
  IconUser,
  IconRefresh,
  IconChevronRight,
} from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseClient";
import POSCredentialVerifyAndRequestAuthorizeForm from "./POSCredentialVerifyAndRequestAuthorizeForm";

interface POSSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function POSSettingsDialog({
  open,
  onClose,
}: POSSettingsDialogProps) {
  const navigate = useNavigate();
  const { selectedStockId, stocks, openStockDialog, loadCart, loadProducts } =
    usePOS();

  const [verifyOpen, setVerifyOpen] = useState(false);

  const currentStock = stocks.find((s) => s.id === selectedStockId);

  const handleChangeStock = () => {
    const hasInitialSetup = typeof window !== "undefined" && !!window.localStorage.getItem("neverbePOSStockId");
    if (!hasInitialSetup) {
      openStockDialog();
      onClose();
      return;
    }
    setVerifyOpen(true);
  };

  const handleRefreshData = () => {
    if (selectedStockId) {
      loadCart();
      loadProducts(selectedStockId);
      toast.success("Data refreshed");
    }
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("neverbePOSStockId");
        window.localStorage.removeItem("posInvoiceId");
        window.localStorage.removeItem("nvrUser");
      }
      navigate("/", { replace: true });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <>
    <Modal
      open={open}
      onCancel={onClose}
      width="min(680px, 95vw)"
      centered
      footer={null}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-neutral-800 bg-neutral-950 text-white rounded-t-3xl">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-0.5 font-mono">
            TERMINAL CONTROL
          </span>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">POS Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[calc(86vh-120px)] overflow-y-auto">
        {/* Operator & Stock Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-neutral-50/70 border-b border-neutral-100">
          {/* Current User */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800 shrink-0">
              <IconUser size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 font-mono">
                Active Operator
              </p>
              <p className="text-xs font-bold text-neutral-900 truncate">
                {auth.currentUser?.email || "Unknown"}
              </p>
            </div>
          </div>

          {/* Current Stock */}
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800 shrink-0">
              <IconBuilding size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 font-mono">
                Assigned Stock
              </p>
              <p className="text-xs font-black text-neutral-900 uppercase truncate">
                {currentStock?.label || currentStock?.name || "Not selected"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="p-6 space-y-3">
          <div
            onClick={handleChangeStock}
            className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 bg-white hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-black group-hover:text-white transition-all">
                <IconBuilding size={20} />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-neutral-900">Change Stock Location</p>
                <p className="text-[11px] text-neutral-500 font-medium">Switch active terminal inventory location & store cache</p>
              </div>
            </div>
            <IconChevronRight size={18} className="text-neutral-400 group-hover:text-black transition-colors" />
          </div>

          <div
            onClick={handleRefreshData}
            className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 bg-white hover:border-black hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-black group-hover:text-white transition-all">
                <IconRefresh size={20} />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-neutral-900">Refresh System Data</p>
                <p className="text-[11px] text-neutral-500 font-medium">Force reload local catalog, inventory counts & promotional rules</p>
              </div>
            </div>
            <IconChevronRight size={18} className="text-neutral-400 group-hover:text-black transition-colors" />
          </div>

          <div
            onClick={handleLogout}
            className="flex items-center justify-between p-4 rounded-2xl border border-red-200/80 bg-red-50/40 hover:bg-red-50 hover:border-red-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                <IconLogout size={20} />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-red-600">Sign Out of Terminal</p>
                <p className="text-[11px] text-red-500/80 font-medium">Securely end cashier shift session</p>
              </div>
            </div>
            <IconChevronRight size={18} className="text-red-400 group-hover:text-red-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-3xl flex justify-end">
        <Button
          onClick={onClose}
          className="font-black h-11 px-8 rounded-xl text-neutral-700 hover:bg-neutral-200/70 border-transparent text-xs uppercase tracking-wider"
        >
          Close
        </Button>
      </div>
    </Modal>

    <POSCredentialVerifyAndRequestAuthorizeForm
      open={verifyOpen}
      onCancel={() => setVerifyOpen(false)}
      onSuccess={() => {
        setVerifyOpen(false);
        openStockDialog();
        onClose();
      }}
      title="Verify Location Change"
      description="Changing stock location requires security clearance. Please enter your password."
      requiredPermission="change_pos_location"
    />
  </>
  );
}
