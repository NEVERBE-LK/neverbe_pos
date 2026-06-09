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
      render: (date: string) => new Date(date).toLocaleDateString(),
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
          className="h-10 px-6 rounded-xl font-medium shadow-sm"
          style={{ backgroundColor: "#16a34a" }}
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
        className="h-10 px-6 rounded-xl font-medium"
      >
        Back to Search
      </Button>
    );
  } else {
    footerButtons.push(
      <Button
        key="close-modal"
        onClick={handleClose}
        className="h-10 px-6 rounded-xl font-medium"
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
        <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50/30">
          {footerButtons}
        </div>
      }
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {selectedOrder && receiptMode !== "choice" && (
            <button
              onClick={() => {
                setReceiptMode("choice");
                setInvoiceUrl(null);
              }}
              className="text-gray-500 hover:text-gray-700 mr-1 transition-all"
            >
              <IconArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-xl font-bold text-gray-800">
            {selectedOrder ? "Receipt Method" : "Search Invoices"}
          </h2>
        </div>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-0">
        {selectedOrder ? (
          <div className="flex flex-col items-center p-6 bg-white min-h-[450px]">
            <div className="text-center w-full bg-blue-50/80 border border-blue-200 rounded-2xl p-6 mb-6">
              <h3 className="text-blue-700 font-extrabold text-2xl mb-1">
                Found Invoice #{selectedOrder.orderId}
              </h3>
              <p className="text-blue-600 font-medium">
                How would you like to provide the receipt to the customer?
              </p>
            </div>

            {receiptMode === "choice" && (
              <div className="flex flex-col sm:flex-row gap-6 w-full justify-center px-4 py-8 max-w-2xl">
                <button
                  onClick={generatePhysicalBill}
                  className="group flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-gray-100 bg-white hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 w-full sm:w-64 gap-4"
                >
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <IconPrinter size={40} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-lg text-gray-800 tracking-tight">PRINT PHYSICAL</span>
                    <span className="text-xs font-bold text-gray-400 mt-1">Thermal Receipt Printer</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setReceiptMode("ebill")}
                  className="group flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-gray-100 bg-white hover:border-green-500 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all duration-300 w-full sm:w-64 gap-4"
                >
                  <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                    <IconSend size={40} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-lg text-gray-800 tracking-tight">SEND eBILL SMS</span>
                    <span className="text-xs font-bold text-gray-400 mt-1">Instant Digital Receipt</span>
                  </div>
                </button>
              </div>
            )}

            {receiptMode === "physical" && invoiceUrl && (
              <div className="w-full h-[400px] border border-gray-200 bg-gray-50 flex items-center justify-center relative rounded-xl overflow-hidden">
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
              <div className="w-full flex flex-col gap-6 items-center max-w-sm mt-8 border-2 border-green-100 p-8 rounded-3xl bg-white shadow-sm">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-2">
                  <IconSend size={32} />
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-gray-500 tracking-wide uppercase mb-2">
                    Customer Phone Number
                  </p>
                  <Input
                    placeholder="e.g. 077..."
                    value={eBillPhone}
                    onChange={(e) => setEBillPhone(e.target.value)}
                    disabled={eBillSent}
                    className="rounded-xl h-[48px] font-bold text-lg text-center"
                  />
                </div>
                <Button
                  type="primary"
                  icon={eBillSent ? undefined : <IconSend size={18} />}
                  onClick={handleSendEBill}
                  loading={eBillSending}
                  disabled={eBillSent || !eBillPhone.trim()}
                  className="rounded-xl h-[48px] w-full shadow-sm font-black tracking-widest text-base bg-green-600 border-none hover:bg-green-500 disabled:bg-green-500"
                >
                  {eBillSent ? "SMS SENT!" : "SEND RECIEPT"}
                </Button>
                {eBillSent && (
                   <Button 
                    type="link" 
                    onClick={() => {setEBillSent(false); setEBillPhone("");}}
                    className="text-gray-400 text-xs"
                   >
                     Send to another number
                   </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <Input
                size="large"
                placeholder="Enter invoice ID (e.g. inv_...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                prefix={<IconSearch size={18} className="text-gray-400" />}
                className="rounded-xl"
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSearch}
                loading={loading}
                className="rounded-xl font-semibold shadow-sm"
                style={{
                  backgroundColor: "#16a34a",
                  minWidth: 100,
                }}
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
