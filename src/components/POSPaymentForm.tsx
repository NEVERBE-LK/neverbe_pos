import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button, Select, Input, InputNumber, Table, Spin } from "antd";
import { IconX, IconPlus, IconTrash, IconPrinter, IconSend } from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import { POSPayment, POSPaymentMethod } from "@/model/POSTypes";
import toast from "react-hot-toast";
import { auth } from "@/firebase/firebaseClient";
import api from "@/lib/api";
import { pdf } from "@react-pdf/renderer";
import POSInvoicePDF from "./POSInvoicePDF";
import { Order } from "@/model/Order";

export default function POSPaymentForm() {
  const {
    items,
    invoiceId,
    showPaymentDialog,
    selectedStockId,
    closePaymentDialog,
    loadCart,
    regenerateInvoiceId,
  } = usePOS();

  const [payments, setPayments] = useState<POSPayment[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<POSPaymentMethod[]>([]);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [eBillPhone, setEBillPhone] = useState("");
  const [eBillSending, setEBillSending] = useState(false);
  const [eBillSent, setEBillSent] = useState(false);
  const [receiptMode, setReceiptMode] = useState<"choice" | "physical" | "ebill">("choice");
  const itemsTotal = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity * i.price, 0),
    [items],
  );
  const totalDiscount = useMemo(
    () => items.reduce((acc, i) => acc + i.discount, 0),
    [items],
  );
  const paymentsTotal = useMemo(
    () => payments.reduce((acc, p) => acc + p.amount, 0),
    [payments],
  );
  const subtotal = useMemo(
    () => itemsTotal - totalDiscount,
    [itemsTotal, totalDiscount],
  );

  const selectedMethod = useMemo(() => {
    return paymentMethods.find(
      (m) => m.name.toLowerCase() === selectedPaymentMethod.toLowerCase(),
    );
  }, [selectedPaymentMethod, paymentMethods]);

  const hasCustomerFee = useMemo(() => {
    return !!(selectedMethod && (selectedMethod.customerFee || 0) > 0);
  }, [selectedMethod]);

  const customerFee = useMemo(() => {
    const usedMethodIds = Array.from(new Set(payments.map((p) => p.paymentMethodId)));
    return usedMethodIds.reduce((acc, methodId) => {
      const method = paymentMethods.find((m) => m.paymentId === methodId);
      return acc + (method?.customerFee || 0);
    }, 0);
  }, [payments, paymentMethods]);

  const basePaid = useMemo(() => {
    return payments.reduce((acc, p) => {
      const method = paymentMethods.find((m) => m.paymentId === p.paymentMethodId);
      const fee = method?.customerFee || 0;
      return acc + (p.amount - fee);
    }, 0);
  }, [payments, paymentMethods]);

  const pendingBaseAmount = useMemo(() => {
    return Math.max(0, subtotal - basePaid);
  }, [subtotal, basePaid]);

  const grandTotal = subtotal + customerFee;
  const pendingDue = grandTotal - paymentsTotal;

  const isKokoSelected = useMemo(() => {
    return selectedMethod?.paymentId === "pm-006";
  }, [selectedMethod]);

  const preCalculatedAmount = useMemo(() => {
    if (!selectedMethod || pendingBaseAmount <= 0) return 0;
    const fee = selectedMethod.customerFee || 0;
    return Math.round((pendingBaseAmount + fee) * 100) / 100;
  }, [selectedMethod, pendingBaseAmount]);

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await api.get("/api/v1/pos/payment-methods");
      if (Array.isArray(data)) {
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
      toast.error("Could not load payment methods");
    }
  };

  useEffect(() => {
    if (showPaymentDialog && auth.currentUser) {
      fetchPaymentMethods();
    }
    return () => {
      if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
    };
  }, [showPaymentDialog]);

  useEffect(() => {
    return () => {
      if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
    };
  }, [invoiceUrl]);

  const handleAddPayment = () => {
    const amount = hasCustomerFee
      ? preCalculatedAmount
      : parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (
      selectedPaymentMethod !== "cash" &&
      !hasCustomerFee &&
      amount > pendingDue + 0.5
    ) {
      toast.error("Amount exceeds the due amount");
      return;
    }

    if (selectedPaymentMethod === "card" && cardNumber.length !== 4) {
      toast.error("Please enter the last 4 digits of the card");
      return;
    }

    if (isKokoSelected && !referenceId.trim()) {
      toast.error("Please enter the KOKO Payment ID");
      return;
    }

    const method = paymentMethods.find(
      (m) => m.name.toLowerCase() === selectedPaymentMethod,
    );

    const newPayment: POSPayment = {
      id: Date.now().toString().slice(-4),
      paymentMethod: selectedPaymentMethod,
      paymentMethodId: method?.paymentId || "",
      amount,
      cardNumber: cardNumber || "None",
      ...(referenceId.trim() && { referenceId: referenceId.trim() }),
    };

    setPayments([...payments, newPayment]);
    setPaymentAmount("");
    setCardNumber("");
    setReferenceId("");
    setSelectedPaymentMethod("cash");
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handlePlaceOrder = async () => {
    if (paymentsTotal < grandTotal) {
      toast.error("Payment amount is less than total");
      return;
    }

    setLoading(true);
    try {
      const transactionFeeCharge = payments.reduce((acc, payment) => {
        const method = paymentMethods.find(
          (m) => m.name.toLowerCase() === payment.paymentMethod.toLowerCase(),
        );
        const feePercent = method?.fee || 0;
        return acc + payment.amount * (feePercent / 100);
      }, 0);

      const order = {
        orderId: invoiceId?.toLowerCase(),
        items: items.map((i) => ({
          itemId: i.itemId,
          bPrice: i.bPrice,
          variantId: i.variantId,
          name: i.name,
          variantName: i.variantName || i.size || "Default",
          size: i.size,
          quantity: i.quantity,
          price: i.price,
          discount: i.discount,
        })),
        fee: customerFee,
        shippingFee: 0,
        discount: totalDiscount,
        paymentReceived: payments,
        from: "Store",
        stockId: selectedStockId,
        status: "Completed",
        paymentStatus: "Paid",
        paymentMethod:
          payments.length > 1
            ? "MIXED"
            : payments[0]?.paymentMethod?.toUpperCase(),
        ...(payments.length === 1 && {
          paymentMethodId: payments[0].paymentMethodId,
        }),
        total: Math.round(grandTotal * 100) / 100,
        transactionFeeCharge: Math.round(transactionFeeCharge * 100) / 100,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(order));

      const { data } = await api.post("/api/v1/pos/orders", formData);

      if (data.order) {
        toast.success("Order created successfully!");
        setCompletedOrder(data.order);
      }

      regenerateInvoiceId();
      setPayments([]);
      setPaymentAmount("");
      setCardNumber("");
      loadCart();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPayments([]);
    setPaymentAmount("");
    setCardNumber("");
    setInvoiceUrl(null);
    setCompletedOrder(null);
    setEBillPhone("");
    setEBillSent(false);
    setReceiptMode("choice");
    closePaymentDialog();
  };

  const generatePhysicalBill = async () => {
    if (!completedOrder) return;
    setReceiptMode("physical");
    try {
      const blob = await pdf(<POSInvoicePDF order={completedOrder} />).toBlob();
      const url = URL.createObjectURL(blob);
      setInvoiceUrl(url);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleSendEBill = async () => {
    if (!eBillPhone.trim() || eBillPhone.length < 9) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setEBillSending(true);
    try {
      await api.post("/api/v1/pos/ebill", {
        orderId: completedOrder?.orderId,
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

  const paymentColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method: string) => (
        <span className="font-bold uppercase">{method}</span>
      ),
    },
    { title: "Card", dataIndex: "cardNumber", key: "cardNumber" },
    {
      title: "Amount (LKR)",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (amount: number) => (
        <span className="font-bold">{amount.toLocaleString()}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      render: (_: any, record: POSPayment) => (
        <button
          onClick={() => handleRemovePayment(record.id)}
          className="text-gray-400 hover:text-red-500 transition-all"
        >
          <IconTrash size={16} />
        </button>
      ),
    },
  ];

  return (
    <Modal
      open={showPaymentDialog}
      onCancel={handleClose}
      width={700}
      footer={null}
      closeIcon={null}
      className="[&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-xl [&_.ant-modal-content]:!p-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
        <h2 className="text-xl font-bold text-gray-800">Complete Payment</h2>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : completedOrder ? (
          <div className="flex flex-col gap-6 items-center w-full py-4">
            <div className="text-center w-full bg-green-50/80 border border-green-200 rounded-2xl p-6">
              <h3 className="text-green-700 font-extrabold text-2xl mb-1">
                Order Completed Successfully!
              </h3>
              <p className="text-green-600 font-medium">
                How would the customer like their receipt?
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
              <div className="w-full h-[500px] border border-gray-200 bg-gray-50 flex items-center justify-center relative rounded-xl overflow-hidden mt-4">
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
                  className="rounded-xl h-[48px] w-full shadow-sm font-black tracking-widest text-base"
                  style={{ backgroundColor: eBillSent ? "#16a34a" : "#16a34a" }}
                >
                  {eBillSent ? "SMS SENT!" : "SEND RECIEPT"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Payments Table */}
            <Table
              dataSource={payments}
              columns={paymentColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: "No payments added yet" }}
            />

            {/* Add Payment Form */}
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                  Method
                </span>
                <Select
                  value={selectedPaymentMethod}
                  onChange={(value) => setSelectedPaymentMethod(value)}
                  style={{ width: 140 }}
                  className="[&_.ant-select-selector]:!rounded-xl h-[38px] font-semibold"
                  options={paymentMethods.map((m) => ({
                    value: m.name.toLowerCase(),
                    label: m.name,
                  }))}
                />
              </div>

              {selectedPaymentMethod === "card" && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                    Last 4
                  </span>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.slice(0, 4))}
                    maxLength={4}
                    style={{ width: 80 }}
                    className="rounded-xl h-[38px] font-semibold"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                  Pay ID
                </span>
                <Input
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Optional"
                  style={{ width: 100 }}
                  className="rounded-xl h-[38px]"
                />
              </div>

              {hasCustomerFee ? (
                <div className="flex flex-col gap-1 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-[10px] font-bold text-green-600 uppercase">
                    Amount to Collect
                  </span>
                  <span className="font-extrabold text-green-700 leading-none">
                    Rs. {preCalculatedAmount.toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                    Amount
                  </span>
                  <InputNumber
                    value={
                      paymentAmount ? parseFloat(paymentAmount) : undefined
                    }
                    onChange={(val) => setPaymentAmount(val?.toString() || "")}
                    style={{ width: 120 }}
                    className="rounded-xl h-[38px] text-base font-semibold pt-1"
                    min={0}
                  />
                </div>
              )}

              <Button
                type="primary"
                icon={<IconPlus size={18} />}
                onClick={handleAddPayment}
                className="rounded-xl shadow-sm font-semibold"
                style={{ backgroundColor: "#16a34a", height: 38 }}
              >
                ADD
              </Button>
            </div>

            <div className="border-t border-gray-200 pt-4" />

            {/* Summary */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 shadow-sm mt-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 uppercase font-semibold">
                  Subtotal:
                </span>
                <span className="text-sm font-bold">
                  Rs. {itemsTotal.toLocaleString()}
                </span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between mb-1 text-red-500">
                  <span className="text-sm uppercase font-semibold">
                    Discount:
                  </span>
                  <span className="text-sm font-bold">
                    -Rs. {totalDiscount.toLocaleString()}
                  </span>
                </div>
              )}
              {customerFee > 0 && (
                <div className="flex justify-between mb-1 p-2 bg-green-50 border border-dashed border-green-200 -mx-1">
                  <span className="text-sm text-green-700 uppercase font-bold">
                    Customer Fee:
                  </span>
                  <span className="text-sm font-extrabold text-green-700">
                    Rs. {customerFee.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between mb-1">
                <span className="text-sm uppercase font-semibold">
                  Total Paid:
                </span>
                <span className="text-sm font-bold">
                  Rs. {paymentsTotal.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-gray-300 my-2" />
              <div className="flex justify-between">
                <span className="font-bold uppercase">
                  {pendingDue > 0 ? "Due Amount:" : "Change Due:"}
                </span>
                <span
                  className={`font-extrabold ${
                    pendingDue > 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  Rs. {Math.abs(pendingDue).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
        <Button
          onClick={handleClose}
          className="h-12 px-6 rounded-xl font-semibold text-gray-600"
        >
          {completedOrder ? "CLOSE" : "CANCEL"}
        </Button>
        {!completedOrder && (
          <Button
            type="primary"
            onClick={handlePlaceOrder}
            disabled={paymentsTotal < subtotal || loading}
            icon={<IconPrinter size={18} />}
            className="h-12 px-8 rounded-xl font-bold shadow-sm"
            style={{ backgroundColor: "#16a34a" }}
          >
            COMPLETE ORDER
          </Button>
        )}
        {receiptMode === "physical" && invoiceUrl && (
          <Button
            type="primary"
            onClick={() => window.open(invoiceUrl, "_blank")}
            icon={<IconPrinter size={18} />}
            className="h-12 px-8 rounded-xl font-bold shadow-sm"
            style={{ backgroundColor: "#16a34a" }}
          >
            OPEN PDF
          </Button>
        )}
      </div>
    </Modal>
  );
}
