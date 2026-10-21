import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button, Select, Input, InputNumber, Table, Spin, Switch } from "antd";
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
    placePOSOrder,
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
  const [chargeCustomerFee, setChargeCustomerFee] = useState(true);

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

  const availableMethods = useMemo(() => {
    const list = [...paymentMethods];
    if (!list.some((m) => m.name.toLowerCase().includes("exchange") || m.name.toLowerCase().includes("credit"))) {
      list.push({
        paymentId: "pm-credit",
        name: "Store Credit",
        fee: 0,
        customerFee: 0,
        status: "ACTIVE",
        available: ["pos", "store"],
        createdAt: "",
      });
    }
    return list;
  }, [paymentMethods]);

  const selectedMethod = useMemo(() => {
    return availableMethods.find(
      (m) => m.name.toLowerCase() === selectedPaymentMethod.toLowerCase(),
    );
  }, [selectedPaymentMethod, availableMethods]);

  const hasCustomerFee = useMemo(() => {
    return chargeCustomerFee && !!(selectedMethod && (selectedMethod.customerFee || 0) > 0);
  }, [selectedMethod, chargeCustomerFee]);

  const customerFee = useMemo(() => {
    if (!chargeCustomerFee) return 0;
    return payments.reduce((acc, p) => {
      const method = paymentMethods.find((m) => m.paymentId === p.paymentMethodId);
      const feePercent = method?.customerFee || 0;
      const fee = p.amount * (feePercent / (100 + feePercent));
      return acc + fee;
    }, 0);
  }, [payments, paymentMethods, chargeCustomerFee]);

  const basePaid = useMemo(() => {
    return payments.reduce((acc, p) => {
      const method = paymentMethods.find((m) => m.paymentId === p.paymentMethodId);
      const feePercent = chargeCustomerFee ? (method?.customerFee || 0) : 0;
      const fee = p.amount * (feePercent / (100 + feePercent));
      return acc + (p.amount - fee);
    }, 0);
  }, [payments, paymentMethods, chargeCustomerFee]);

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
    const feePercent = chargeCustomerFee ? (selectedMethod.customerFee || 0) : 0;
    const fee = pendingBaseAmount * (feePercent / 100);
    return Math.round((pendingBaseAmount + fee) * 100) / 100;
  }, [selectedMethod, pendingBaseAmount, chargeCustomerFee]);

  // Auto-prefill payment amount for methods without customer fee (like cash or waived fee)
  useEffect(() => {
    if (!hasCustomerFee && pendingDue > 0) {
      setPaymentAmount(Math.round(pendingDue * 100) / 100 + "");
    } else {
      setPaymentAmount("");
    }
  }, [selectedPaymentMethod, hasCustomerFee, pendingDue]);

  const fetchPaymentMethods = async () => {
    const cacheKey = "neverbePOSPaymentMethodsCache";
    try {
      if (navigator.onLine) {
        const { data } = await api.get("/api/v1/pos/payment-methods");
        if (Array.isArray(data)) {
          setPaymentMethods(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } else {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setPaymentMethods(JSON.parse(cached));
        }
      }
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setPaymentMethods(JSON.parse(cached));
      } else {
        toast.error("Could not load payment methods");
      }
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

      const data = await placePOSOrder(order);

      if (data.order) {
        if (data.isOffline) {
          toast.success("Order saved offline. Will sync when back online!");
        } else {
          toast.success("Order created successfully!");
        }
        setCompletedOrder(data.order);
      }

      regenerateInvoiceId();
      setPayments([]);
      setPaymentAmount("");
      setCardNumber("");
      setChargeCustomerFee(true);
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
    setChargeCustomerFee(true);
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
      width={completedOrder ? "min(900px, 95vw)" : "min(1020px, 95vw)"}
      centered
      footer={null}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-neutral-800 bg-neutral-950 text-white rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center font-black text-xs text-white">
            Rs
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                PAYMENT TENDER
              </span>
              {invoiceId && (
                <span className="bg-neutral-800 text-neutral-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                  #{invoiceId.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white tracking-tight leading-tight">
              {completedOrder ? "Order Receipt Dispatch" : "Complete Transaction"}
            </h2>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[calc(86vh-140px)] min-h-[440px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Spin size="large" />
          </div>
        ) : completedOrder ? (
          <div className="flex flex-col gap-6 items-center w-full py-2">
            <div className="text-center w-full bg-neutral-950 text-white border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-neutral-100 to-emerald-500" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-widest uppercase mb-2">
                VERIFIED TRANSACTION
              </div>
              <h3 className="text-white font-black text-2xl tracking-tight mb-1">
                Order Completed Successfully
              </h3>
              <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                Order #{completedOrder.orderId?.toUpperCase()} · LKR {completedOrder.total?.toLocaleString()}
              </p>
            </div>

            {receiptMode === "choice" && (
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-2 py-4 max-w-2xl">
                <button
                  onClick={generatePhysicalBill}
                  className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-neutral-200 bg-white hover:border-black hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 w-full sm:w-60 gap-3"
                >
                  <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-all duration-300">
                    <IconPrinter size={32} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-sm text-neutral-900 tracking-tight uppercase">PRINT THERMAL</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-0.5">Physical Receipt</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setReceiptMode("ebill")}
                  className="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-neutral-200 bg-white hover:border-black hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 w-full sm:w-60 gap-3"
                >
                  <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-black group-hover:text-white transition-all duration-300">
                    <IconSend size={32} className="group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-sm text-neutral-900 tracking-tight uppercase">SEND eBILL SMS</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-0.5">Instant Digital SMS</span>
                  </div>
                </button>
              </div>
            )}

            {receiptMode === "physical" && invoiceUrl && (
              <div className="w-full h-[450px] border border-neutral-200 bg-neutral-100 flex items-center justify-center relative rounded-2xl overflow-hidden mt-2">
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
              <div className="w-full flex flex-col gap-4 items-center max-w-sm mt-4 border-2 border-neutral-200 p-6 rounded-2xl bg-white shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <IconSend size={24} />
                </div>
                <div className="w-full">
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-2">
                    Customer Phone Number
                  </p>
                  <Input
                    placeholder="e.g. 0771234567"
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
                  className="rounded-xl h-[46px] w-full shadow-md font-black tracking-widest text-xs uppercase text-white !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 transition-all"
                >
                  {eBillSent ? "SMS SENT!" : "DISPATCH RECEIPT"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Payments List & Add Payment Form (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Payments Table */}
              <div className="border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs bg-white">
                <div className="px-4 py-2.5 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 font-mono">
                    Allocated Payments
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400 font-mono">
                    {payments.length} {payments.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <Table
                  dataSource={payments}
                  columns={paymentColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  locale={{ emptyText: "No payments added yet" }}
                />
              </div>

              {/* Add Payment Form */}
              <div className="p-4 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 block mb-3 font-mono">
                  + Add Payment Tender
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">
                      Method
                    </span>
                    <Select
                      value={selectedPaymentMethod}
                      onChange={(value) => setSelectedPaymentMethod(value)}
                      className="[&_.ant-select-selector]:!rounded-xl h-[42px] font-bold w-full"
                      options={availableMethods.map((m) => ({
                        value: m.name.toLowerCase(),
                        label: m.name,
                      }))}
                    />
                  </div>

                  {selectedMethod && (selectedMethod.customerFee || 0) > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500 whitespace-nowrap">
                        Customer Fee ({selectedMethod.customerFee}%)
                      </span>
                      <div className="flex items-center justify-between px-3 h-[42px] bg-white border border-neutral-200 rounded-xl">
                        <span className="text-xs font-bold text-neutral-600">Charge Fee</span>
                        <Switch
                          checked={chargeCustomerFee}
                          onChange={(checked) => setChargeCustomerFee(checked)}
                          className={chargeCustomerFee ? "bg-black" : "bg-neutral-300"}
                        />
                      </div>
                    </div>
                  ) : selectedPaymentMethod === "card" ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">
                        Card Last 4
                      </span>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.slice(0, 4))}
                        maxLength={4}
                        placeholder="e.g. 4242"
                        className="rounded-xl h-[42px] font-mono font-bold w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">
                        Reference / Note
                      </span>
                      <Input
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        placeholder="Optional"
                        className="rounded-xl h-[42px] font-medium text-xs w-full"
                      />
                    </div>
                  )}

                  {selectedPaymentMethod === "card" && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">
                        Reference ID
                      </span>
                      <Input
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        placeholder="Optional"
                        className="rounded-xl h-[42px] font-medium text-xs w-full"
                      />
                    </div>
                  )}

                  {hasCustomerFee ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700 whitespace-nowrap">
                        Amount to Collect
                      </span>
                      <div className="flex items-center h-[42px] px-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                        <span className="font-black text-emerald-800 text-sm truncate font-mono">
                          Rs. {preCalculatedAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-500">
                        Amount (Rs)
                      </span>
                      <InputNumber
                        value={paymentAmount ? parseFloat(paymentAmount) : undefined}
                        onChange={(val) => setPaymentAmount(val?.toString() || "")}
                        className="rounded-xl h-[42px] text-base font-black pt-0.5 w-full"
                        min={0}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="col-span-full">
                    <Button
                      type="primary"
                      icon={<IconPlus size={18} />}
                      onClick={handleAddPayment}
                      className="w-full rounded-xl shadow-xs font-black text-xs uppercase tracking-wider !bg-black hover:!bg-neutral-800 text-white h-[42px]"
                    >
                      ADD PAYMENT TENDER
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Summary Card (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="p-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-3 font-mono">
                    TRANSACTION SUMMARY
                  </span>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs text-neutral-600 font-medium">
                      <span className="uppercase tracking-wider">Subtotal:</span>
                      <span className="font-bold text-neutral-900">Rs. {itemsTotal.toLocaleString()}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-xs text-red-500 font-medium">
                        <span className="uppercase tracking-wider">Discount:</span>
                        <span className="font-bold">-Rs. {totalDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {customerFee > 0 && (
                      <div className="flex justify-between p-2 bg-emerald-50 border border-dashed border-emerald-200 rounded-lg text-xs text-emerald-700 font-bold">
                        <span className="uppercase tracking-wider">Customer Fee:</span>
                        <span>Rs. {customerFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-neutral-600 font-medium">
                      <span className="uppercase tracking-wider">Total Paid:</span>
                      <span className="font-bold text-neutral-900">Rs. {paymentsTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t-2 border-neutral-900">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-black text-xs uppercase tracking-wider text-neutral-900">
                      {pendingDue > 0 ? "Due Amount:" : "Change Due:"}
                    </span>
                    <span
                      className={`font-black text-3xl tracking-tight font-mono ${
                        pendingDue > 0 ? "text-red-500" : "text-emerald-600"
                      }`}
                    >
                      Rs. {Math.abs(pendingDue).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1">
                    {pendingDue > 0
                      ? "Additional payment required to complete"
                      : "Return change to customer upon completion"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-5 border-t border-neutral-100 bg-neutral-50/50 rounded-b-2xl">
        <Button
          onClick={handleClose}
          className="h-12 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-600 hover:bg-neutral-200/70 border-transparent"
        >
          {completedOrder ? "CLOSE" : "CANCEL"}
        </Button>
        {!completedOrder && (
          <Button
            type="primary"
            onClick={handlePlaceOrder}
            disabled={paymentsTotal < subtotal || loading}
            icon={<IconPrinter size={18} />}
            className="h-12 px-8 rounded-xl font-black shadow-lg text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 transition-all"
          >
            COMPLETE ORDER
          </Button>
        )}
        {receiptMode === "physical" && invoiceUrl && (
          <Button
            type="primary"
            onClick={() => window.open(invoiceUrl, "_blank")}
            icon={<IconPrinter size={18} />}
            className="h-12 px-8 rounded-xl font-black shadow-lg text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 transition-all"
          >
            OPEN PDF
          </Button>
        )}
      </div>
    </Modal>
  );
}
