import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Table, Spin, Tag } from "antd";
import {
  IconSearch,
  IconX,
  IconEye,
  IconPrinter,
  IconArrowLeft,
  IconSend,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { pdf } from "@react-pdf/renderer";
import POSInvoicePDF from "./POSInvoicePDF";
import { Order } from "@/model/Order";

import { formatSLDateOnly } from "../utils/date";

interface POSInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function POSInvoiceDialog({
  open,
  onClose,
}: POSInvoiceDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [eBillPhone, setEBillPhone] = useState("");
  const [eBillSending, setEBillSending] = useState(false);
  const [eBillSent, setEBillSent] = useState(false);
  const [receiptMode, setReceiptMode] = useState<"choice" | "physical" | "ebill">("choice");

  useEffect(() => {
    return () => {
      if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
    };
  }, [invoiceUrl]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    setInvoiceUrl(null);
    try {
      if (navigator.onLine) {
        const { data } = await api.get(`/api/v1/pos/orders/${searchQuery}`);
        if (data && data.orderId) {
          setInvoices([data]);
        } else if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          setInvoices([]);
        }
      } else {
        const queueStr = localStorage.getItem("neverbePOSOfflineQueue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        const matching = queue.filter((o: any) => o.orderId.toLowerCase().includes(searchQuery.toLowerCase()));
        setInvoices(matching);
      }
    } catch (error) {
      console.error("Failed to search invoices:", error);
      const queueStr = localStorage.getItem("neverbePOSOfflineQueue");
      const queue = queueStr ? JSON.parse(queueStr) : [];
      const matching = queue.filter((o: any) => o.orderId.toLowerCase().includes(searchQuery.toLowerCase()));
      setInvoices(matching);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setInvoices([]);
    setSearched(false);
    setInvoiceUrl(null);
    setSelectedOrder(null);
    setReceiptMode("choice");
    onClose();
  };

  const handleViewInvoice = async (order: Order) => {
    try {
      if (!order || !order.items) {
        toast.error("Invalid order data");
        return;
      }

      setSelectedOrder(order);
      setEBillPhone("");
      setEBillSent(false);
      setReceiptMode("choice");
      setInvoiceUrl(null);
    } catch (err) {
      console.error("Failed to select invoice", err);
    }
  };

  const generatePhysicalBill = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      const blob = await pdf(<POSInvoicePDF order={selectedOrder} />).toBlob();
      const url = URL.createObjectURL(blob);
      setInvoiceUrl(url);
      setReceiptMode("physical");
    } catch (err) {
      console.error("Failed to generate PDF", err);
      toast.error("Failed to generate invoice PDF");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (invoiceUrl) {
      const printWindow = window.open(invoiceUrl, "_blank");
      if (printWindow) {
        printWindow.onload = () => printWindow.focus();
      } else {
        alert("Popup blocked! Please allow popups to print invoices.");
      }
    }
  };

  const handleBack = () => {
    setInvoiceUrl(null);
    setSelectedOrder(null);
  };

  const handleSendEBill = async () => {
    if (!eBillPhone.trim() || eBillPhone.length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setEBillSending(true);
    try {
      await api.post("/api/v1/pos/ebill", {
        orderId: selectedOrder?.orderId,
        phone: eBillPhone.trim(),
      });
      toast.success("eBill sent successfully!");
      setEBillSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send eBill");
    } finally {
      setEBillSending(false);
    }
  };

  const columns = [
    {
      title: "Invoice ID",
      dataIndex: "orderId",
      key: "orderId",
      render: (id: string) => <span className="font-semibold">#{id}</span>,
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => formatSLDateOnly(date),
    },
    {
      title: "Items",
      dataIndex: "items",
      key: "items",
      render: (items: any[]) => `${items?.length || 0} items`,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right" as const,
      render: (total: number) => `Rs. ${total?.toLocaleString()}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "Completed" ? "green" : "orange"}>{status}</Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      render: (_: any, record: any) => (
        <button
          onClick={() => handleViewInvoice(record)}
          className="text-green-600 hover:text-green-800 transition-all"
          title="View Invoice"
        >
          <IconEye size={18} />
        </button>
      ),
    },
  ];

  const footerButtons = [];
  if (selectedOrder) {
    if (receiptMode !== "choice") {
      footerButtons.push(
        <Button
          key="back-choice"
          onClick={() => {
            setReceiptMode("choice");
            setInvoiceUrl(null);
          }}
          className="h-10 px-6 rounded-xl font-medium"
        >
          Change Method
        </Button>
      );
    }
    
    if (receiptMode === "physical" && invoiceUrl) {
      footerButtons.push(
        <Button
          key="print"
          type="primary"
          onClick={handlePrint}
          icon={<IconPrinter size={18} />}
          className="h-10 px-6 rounded-xl font-black text-xs uppercase tracking-wider shadow-md text-white !bg-black hover:!bg-neutral-800"
        >
          Print
        </Button>
      );
    }

    footerButtons.push(
      <Button
        key="close-order"
        onClick={() => {
          setSelectedOrder(null);
          setInvoiceUrl(null);
          setReceiptMode("choice");
        }}
        className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-600 hover:bg-neutral-100"
      >
        Back to Search
      </Button>
    );
  } else {
    footerButtons.push(
      <Button
        key="close-modal"
        onClick={handleClose}
        className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-600 hover:bg-neutral-100"
      >
        Close
      </Button>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={selectedOrder ? 800 : 700}
      footer={
        <div className="flex justify-end gap-3 p-4 border-t border-neutral-100 bg-neutral-50/50">
          {footerButtons}
        </div>
      }
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-neutral-100 bg-neutral-900 text-white">
        <div className="flex items-center gap-3">
          {selectedOrder && receiptMode !== "choice" && (
            <button
              onClick={() => {
                setReceiptMode("choice");
                setInvoiceUrl(null);
              }}
              className="text-neutral-400 hover:text-white mr-1 transition-all"
            >
              <IconArrowLeft size={20} />
            </button>
          )}
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-0.5">
              ORDER REPRINT & ARCHIVE
            </span>
            <h2 className="text-xl font-black text-white tracking-tight leading-tight">
              {selectedOrder ? "Receipt Dispatch" : "Search Invoices"}
            </h2>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-0">
        {selectedOrder ? (
          <div className="flex flex-col items-center p-6 bg-white min-h-[450px]">
            <div className="text-center w-full bg-neutral-950 text-white border border-neutral-800 rounded-2xl p-6 mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-1">
                ARCHIVED TRANSACTION
              </span>
              <h3 className="text-white font-black text-2xl tracking-tight mb-1">
                Invoice #{selectedOrder.orderId?.toUpperCase()}
              </h3>
              <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                Select dispatch format for customer receipt
              </p>
            </div>

            {receiptMode === "choice" && (
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4 py-8 max-w-2xl">
                <button
                  onClick={generatePhysicalBill}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-neutral-200 bg-white hover:border-black hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 w-full sm:w-64 gap-4"
                >
                  <div className="w-18 h-18 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-all duration-300">
                    <IconPrinter size={36} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-sm text-neutral-900 tracking-tight uppercase">PRINT THERMAL</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">Receipt Printer</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setReceiptMode("ebill")}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-neutral-200 bg-white hover:border-black hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 w-full sm:w-64 gap-4"
                >
                  <div className="w-18 h-18 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-all duration-300">
                    <IconSend size={36} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-sm text-neutral-900 tracking-tight uppercase">SEND eBILL SMS</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">Instant Digital Receipt</span>
                  </div>
                </button>
              </div>
            )}

            {receiptMode === "physical" && invoiceUrl && (
              <div className="w-full h-[400px] border border-neutral-200 bg-neutral-100 flex items-center justify-center relative rounded-2xl overflow-hidden">
                <iframe
                  src={invoiceUrl}
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                  title="Invoice Preview"
                />
              </div>
            )}

            {receiptMode === "ebill" && (
              <div className="w-full flex flex-col gap-4 items-center max-w-sm mt-6 border-2 border-neutral-200 p-6 rounded-2xl bg-white shadow-sm">
                <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 mb-1">
                  <IconSend size={28} />
                </div>
                <div className="w-full">
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-2">
                    Customer Phone Number
                  </p>
                  <Input
                    placeholder="e.g. 077..."
                    value={eBillPhone}
                    onChange={(e) => setEBillPhone(e.target.value)}
                    disabled={eBillSent}
                    className="rounded-xl h-[46px] font-bold text-base text-center"
                  />
                </div>
                <Button
                  type="primary"
                  icon={eBillSent ? undefined : <IconSend size={18} />}
                  onClick={handleSendEBill}
                  loading={eBillSending}
                  disabled={eBillSent || !eBillPhone.trim()}
                  className="rounded-xl h-[46px] w-full shadow-md font-black tracking-widest text-xs uppercase text-white !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 border-none transition-all"
                >
                  {eBillSent ? "SMS SENT!" : "DISPATCH RECEIPT"}
                </Button>
                {eBillSent && (
                   <Button 
                    type="link" 
                    onClick={() => {setEBillSent(false); setEBillPhone("");}}
                    className="text-neutral-500 font-bold text-xs"
                   >
                     Send to another number
                   </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            {/* Search Bar */}
            <div className="flex gap-2">
              <Input
                size="large"
                placeholder="Enter invoice ID (e.g. inv_...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                prefix={<IconSearch size={18} className="text-neutral-400" />}
                className="rounded-xl font-medium"
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSearch}
                loading={loading}
                className="rounded-xl font-black text-xs uppercase tracking-wider shadow-md text-white !bg-black hover:!bg-neutral-800"
                style={{ minWidth: 100 }}
              >
                Search
              </Button>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : searched && invoices.length === 0 ? (
              <div className="flex justify-center py-8">
                <p className="text-gray-500">No invoices found</p>
              </div>
            ) : invoices.length > 0 ? (
              <Table
                dataSource={invoices}
                columns={columns}
                rowKey="orderId"
                size="small"
                pagination={false}
              />
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
