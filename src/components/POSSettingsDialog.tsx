import React, { useState } from "react";
import { Modal, Button } from "antd";
import {
  IconX,
  IconLogout,
  IconBuilding,
  IconUser,
  IconRefresh,
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
      width={420}
      footer={null}
      closeIcon={null}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-neutral-100 bg-neutral-900 text-white">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-0.5">
            TERMINAL CONTROL
          </span>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">POS Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-neutral-100">
        {/* Current User */}
        <div className="flex items-center gap-3.5 py-4 px-6 bg-neutral-50/50">
          <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center text-neutral-800">
            <IconUser size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Active Operator
            </p>
            <p className="text-sm font-bold text-neutral-900">
              {auth.currentUser?.email || "Unknown"}
            </p>
          </div>
        </div>

        {/* Current Stock */}
        <div className="flex items-center gap-3.5 py-4 px-6 bg-neutral-50/50">
          <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center text-neutral-800">
            <IconBuilding size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Assigned Stock
            </p>
            <p className="text-sm font-black text-neutral-900 uppercase">
              {currentStock?.label || currentStock?.name || "Not selected"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div
          onClick={handleChangeStock}
          className="flex items-center gap-3.5 py-4 px-6 cursor-pointer transition-all hover:bg-neutral-100/70 text-neutral-800 hover:text-black group"
        >
          <IconBuilding size={20} className="text-neutral-500 group-hover:text-black transition-colors" />
          <span className="font-black text-xs uppercase tracking-wider">CHANGE STOCK LOCATION</span>
        </div>

        <div
          onClick={handleRefreshData}
          className="flex items-center gap-3.5 py-4 px-6 cursor-pointer transition-all hover:bg-neutral-100/70 text-neutral-800 hover:text-black group"
        >
          <IconRefresh size={20} className="text-neutral-500 group-hover:text-black transition-colors" />
          <span className="font-black text-xs uppercase tracking-wider">REFRESH SYSTEM DATA</span>
        </div>

        <div
          onClick={handleLogout}
          className="flex items-center gap-3.5 py-4 px-6 cursor-pointer transition-all text-red-600 hover:bg-red-50/60"
        >
          <IconLogout size={20} />
          <span className="font-black text-xs uppercase tracking-wider">SIGN OUT OF TERMINAL</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 rounded-b-3xl">
        <Button
          onClick={onClose}
          block
          className="font-black h-12 rounded-xl text-neutral-700 hover:bg-neutral-200/70 border-transparent text-xs uppercase tracking-wider"
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
