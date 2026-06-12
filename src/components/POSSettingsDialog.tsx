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
      width={400}
      footer={null}
      closeIcon={null}
      className="[&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-xl [&_.ant-modal-content]:!p-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
        <h2 className="text-xl font-bold text-gray-800">POS Settings</h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div>
        {/* Current User */}
        <div className="flex items-center gap-3 py-4 px-4">
          <IconUser size={20} className="text-green-600" />
          <div>
            <p className="text-[0.75rem] font-bold uppercase text-gray-500">
              Logged in as
            </p>
            <p className="text-[0.9rem] font-semibold text-black">
              {auth.currentUser?.email || "Unknown"}
            </p>
          </div>
        </div>

        <div className="border-t-2 border-gray-200" />

        {/* Current Stock */}
        <div className="flex items-center gap-3 py-4 px-4">
          <IconBuilding size={20} className="text-green-600" />
          <div>
            <p className="text-[0.75rem] font-bold uppercase text-gray-500">
              Current Stock
            </p>
            <p className="text-[0.9rem] font-semibold text-black uppercase">
              {currentStock?.label || currentStock?.name || "Not selected"}
            </p>
          </div>
        </div>

        <div className="border-t-2 border-gray-200" />

        {/* Actions */}
        <div
          onClick={handleChangeStock}
          className="flex items-center gap-3 py-4 px-4 cursor-pointer transition-all hover:bg-green-50"
        >
          <IconBuilding size={20} className="text-green-600" />
          <span className="font-bold text-[0.9rem]">CHANGE STOCK LOCATION</span>
        </div>

        <div className="border-t border-gray-200" />

        <div
          onClick={handleRefreshData}
          className="flex items-center gap-3 py-4 px-4 cursor-pointer transition-all hover:bg-green-50"
        >
          <IconRefresh size={20} className="text-green-600" />
          <span className="font-bold text-[0.9rem]">REFRESH DATA</span>
        </div>

        <div className="border-t border-gray-200" />

        <div
          onClick={handleLogout}
          className="flex items-center gap-3 py-4 px-4 cursor-pointer transition-all text-red-500 hover:bg-red-50"
        >
          <IconLogout size={20} />
          <span className="font-bold text-[0.9rem]">LOGOUT</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
        <Button
          onClick={onClose}
          block
          className="font-semibold h-12 rounded-xl text-gray-600 hover:bg-gray-100 border-gray-200"
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
