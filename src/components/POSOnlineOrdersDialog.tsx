import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Table, Spin, Tag, Badge, Tooltip, Select } from "antd";
import {
  IconSearch,
  IconX,
  IconTruck,
  IconPackage,
  IconPrinter,
  IconRefresh,
  IconCheck,
  IconChevronRight,
  IconUser,
  IconPhone,
  IconClock,
  IconExternalLink,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { pdf } from "@react-pdf/renderer";
import POSInvoicePDF from "./POSInvoicePDF";
import { Order } from "@/model/Order";
import { formatSLDate } from "../utils/date";

interface POSOnlineOrdersDialogProps {
  open: boolean;
  onClose: () => void;
  selectedStockId?: string | null;
  initialOrderId?: string | null;
}

export default function POSOnlineOrdersDialog({
  open,
  onClose,
  selectedStockId,
  initialOrderId,
}: POSOnlineOrdersDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("Processing");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState<string>("Domex");

  useEffect(() => {
    if (open) {
      if (initialOrderId) {
        setSearchQuery(initialOrderId);
        setActiveTab("ALL");
      }
      fetchOrders();
    }
  }, [open, activeTab, selectedStockId, initialOrderId]);

  useEffect(() => {
    if (selectedOrder) {
      setTrackingNumber(selectedOrder.trackingNumber || "");
      setCourier(selectedOrder.courier || "Domex");
    }
  }, [selectedOrder?.orderId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Solely fetch and display website orders
      const params: any = {
        limit: 50,
        from: "Website",
      };
      if (activeTab !== "ALL") {
        params.status = activeTab;
      }
      if (selectedStockId) {
        params.stockId = selectedStockId;
      }

      let fetchedOrders: Order[] = [];
      try {
        const res = await api.get("/api/v1/erp/orders", { params });
        const list = res.data?.data || res.data?.dataList || res.data || [];
        fetchedOrders = Array.isArray(list) ? list : [];
      } catch (erpErr) {
        // Fallback to POS orders endpoint
        try {
          const posRes = await api.get("/api/v1/pos/orders", { params });
          const list = posRes.data?.data || posRes.data || [];
          fetchedOrders = Array.isArray(list) ? list : [];
        } catch (posErr) {
          console.warn("Could not fetch remote orders", posErr);
        }
      }

      // Filter solely for website orders only
      const websiteOrders = fetchedOrders.filter((o) => {
        const fromSource = (o.from || "").toLowerCase();
        return fromSource === "website" || fromSource === "online";
      });

      setOrders(websiteOrders);
    } catch (err: any) {
      console.error("Failed to load orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessOrder = async (order: Order) => {
    setProcessingId(order.orderId);
    try {
      const payload: any = {
        status: "Completed",
        courier: courier || order.courier || "Domex",
        trackingNumber: trackingNumber.trim() || order.trackingNumber || "",
        sendNotification: true,
      };

      // Try ERP tracking update, then order update (Processing -> Completed)
      try {
        await api.patch(`/api/v1/erp/orders/${order.orderId}/tracking`, payload);
      } catch {
        await api.put(`/api/v1/erp/orders/${order.orderId}`, payload);
      }

      toast.success(`Order #${order.orderId} processed to Completed!`);
      if (selectedOrder?.orderId === order.orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: "Completed",
          courier: payload.courier,
          trackingNumber: payload.trackingNumber,
        });
      }
      fetchOrders();
    } catch (err: any) {
      console.error("Process order error:", err);
      toast.error(err.response?.data?.message || `Failed to process order`);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrintSlip = async (order: Order) => {
    try {
      const blob = await pdf(<POSInvoicePDF order={order} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate order slip");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderId?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.phone?.includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Processing
          </span>
        );
      case "payment pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Payment Pending
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
            {status || "Unknown"}
          </span>
        );
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="min(1280px, 96vw)"
      footer={null}
      closeIcon={null}
      centered
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-7 py-5 border-b border-neutral-100 bg-neutral-900 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
            <IconTruck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                ORDER FULFILLMENT
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight leading-tight">
              Orders Processing
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
            title="Refresh Orders"
          >
            <IconRefresh size={18} />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Layout - Fixed Viewport Height With Internal Scroll */}
      <div className="flex flex-col lg:flex-row h-[calc(86vh-90px)] min-h-[540px] max-h-[740px] bg-neutral-50/50 overflow-hidden">
        {/* Left Column: Orders List */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col border-r border-neutral-200/80 overflow-hidden bg-white">
          {/* Status Tabs & Search */}
          <div className="p-4 border-b border-neutral-200/80 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {["Processing", "Payment Pending", "Completed", "ALL"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab
                      ? "bg-black text-white shadow-sm"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-black"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <Input
              placeholder="Search by Order ID, Customer, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<IconSearch size={16} className="text-neutral-400 mr-1.5" />}
              className="rounded-xl h-10 font-medium text-xs bg-neutral-50 border-neutral-200 focus:bg-white focus:border-black"
              allowClear
            />
          </div>

          {/* Orders Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <IconPackage size={40} className="text-neutral-300 mb-2" />
                <p className="font-black text-xs uppercase tracking-wider text-neutral-700">
                  No Orders Found
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  There are no orders currently under '{activeTab}'.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrder?.orderId === order.orderId;
                return (
                  <div
                    key={order.orderId}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 cursor-pointer transition-all duration-150 flex flex-col gap-2 hover:bg-neutral-50 ${
                      isSelected ? "bg-neutral-100/80 border-l-4 border-l-black" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-neutral-950">
                          #{order.orderId?.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700">
                          {order.from || "Website"}
                        </span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-600 font-medium">
                        <IconUser size={14} className="text-neutral-400" />
                        <span className="truncate max-w-[150px]">
                          {order.customer?.name || "Customer"}
                        </span>
                      </div>
                      <span className="font-black text-neutral-900 font-mono">
                        Rs. {order.total?.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      <span>{order.items?.length || 0} ITEMS</span>
                      <span>{order.paymentMethod?.toUpperCase() || "COD"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Detail & Actions */}
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/40">
          {selectedOrder ? (
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-5">
              {/* Order Header Card */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block">
                      ORDER DETAILS
                    </span>
                    <h3 className="text-xl font-black text-neutral-950 tracking-tight font-mono">
                      #{selectedOrder.orderId?.toUpperCase()}
                    </h3>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-neutral-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Customer
                    </span>
                    <p className="font-bold text-neutral-900 truncate">{selectedOrder.customer?.name || "Guest"}</p>
                    <p className="text-neutral-500 font-mono text-[11px]">{selectedOrder.customer?.phone || "No phone"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Delivery Location
                    </span>
                    <p className="font-bold text-neutral-900 truncate">{selectedOrder.deliveryAddress?.city || "Standard Delivery"}</p>
                    <p className="text-neutral-500 text-[11px] truncate">{selectedOrder.deliveryAddress?.address || "Website Delivery"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Payment
                    </span>
                    <p className="font-bold text-neutral-900">{selectedOrder.paymentMethod?.toUpperCase() || "COD"}</p>
                    <span className={`text-[10px] font-black uppercase inline-block mt-0.5 px-2 py-0.5 rounded ${
                      selectedOrder.paymentStatus?.toLowerCase() === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {selectedOrder.paymentStatus || "Pending"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Date & Source
                    </span>
                    <p className="font-bold text-neutral-900">{formatSLDate(selectedOrder.createdAt) || "Recently"}</p>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">{selectedOrder.from || "Website"}</span>
                  </div>
                </div>
              </div>

              {/* Items Card */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block">
                  ORDER ITEMS ({selectedOrder.items?.length || 0})
                </span>
                <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto pr-1">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center font-black text-xs text-neutral-700 shrink-0 border border-neutral-200">
                          {item.quantity}x
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 leading-tight">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 uppercase font-semibold">
                            {item.variantName || item.size || "Standard"} • Size {item.size || "-"}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 shrink-0">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t-2 border-neutral-900 flex justify-between items-baseline">
                  <span className="font-black text-xs uppercase tracking-wider text-neutral-900">Total Order Amount</span>
                  <span className="font-black text-xl text-neutral-950 font-mono">
                    Rs. {selectedOrder.total?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Fulfillment Controls - Processing to Completed flow */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block">
                  FULFILLMENT CONTROLS
                </span>

                {selectedOrder.status?.toLowerCase() === "completed" ? (
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <IconCheck size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-emerald-950 m-0">Order Completed & Fulfilled</p>
                        <p className="text-[11px] text-emerald-700 m-0 font-mono mt-0.5">
                          {selectedOrder.courier || "Courier"} {selectedOrder.trackingNumber ? `• Ref: ${selectedOrder.trackingNumber}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePrintSlip(selectedOrder)}
                      icon={<IconPrinter size={16} />}
                      className="h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-800 bg-white hover:bg-neutral-100 border-emerald-300"
                    >
                      Print Slip
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
                          Courier Partner
                        </label>
                        <Select
                          value={courier}
                          onChange={(val) => setCourier(val)}
                          className="w-full h-11 text-xs font-bold"
                          options={[
                            { value: "Domex", label: "Domex Courier" },
                            { value: "Pronto", label: "Pronto Lanka" },
                            { value: "Grasshoppers", label: "Grasshoppers" },
                            { value: "Fulfill", label: "Fulfill.lk" },
                            { value: "Prompt Express", label: "Prompt Express" },
                            { value: "Self Delivery", label: "Self Hand Delivery" },
                            { value: "Other", label: "Other Courier Service" },
                          ]}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
                          Courier Tracking Reference (Optional)
                        </label>
                        <Input
                          placeholder="e.g. PRN-984321..."
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          className="rounded-xl h-11 font-mono font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <Button
                        type="primary"
                        loading={processingId === selectedOrder.orderId}
                        onClick={() => handleProcessOrder(selectedOrder)}
                        icon={<IconCheck size={18} />}
                        className="flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 border-none shadow-md flex items-center justify-center gap-2"
                      >
                        CONFIRM & PROCESS ORDER
                      </Button>
                      <Button
                        onClick={() => handlePrintSlip(selectedOrder)}
                        icon={<IconPrinter size={18} />}
                        className="h-12 px-5 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 border-neutral-300 flex items-center justify-center gap-1.5"
                      >
                        Print Slip
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <IconTruck size={48} className="text-neutral-300 mb-3" />
              <h4 className="font-black text-sm uppercase tracking-wider text-neutral-800">
                Select an Order
              </h4>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">
                Choose a website order from the left list to review items, process fulfillment, or generate slips.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
