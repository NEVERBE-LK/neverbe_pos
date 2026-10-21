import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Table, Alert, Spin, Tag } from "antd";
import {
  IconX,
  IconSearch,
  IconArrowsExchange,
  IconPlus,
  IconMinus,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import api from "@/lib/api";
import { usePOS } from "../context/POSContext";
import POSVariantDialog from "./POSVariantDialog";
import toast from "react-hot-toast";

/* ================= TYPES ================= */

interface ExchangeItem {
  itemId: string;
  variantId: string;
  name: string;
  variantName: string;
  size: string;
  quantity: number;
  price: number;
  discount: number;
  maxQuantity?: number;
}

interface OrderData {
  orderId: string;
  docId: string;
  items: any[];
  createdAt: string;
  total: number;
  customer?: { name?: string };
}

interface POSExchangeDialogProps {
  open: boolean;
  onClose: () => void;
}

/* ================= COMPONENT ================= */

export default function POSExchangeDialog({
  open,
  onClose,
}: POSExchangeDialogProps) {
  const { selectedStockId } = usePOS();

  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [eligible, setEligible] = useState(false);
  const [workingDays, setWorkingDays] = useState<number | null>(null);

  const [returnedItems, setReturnedItems] = useState<ExchangeItem[]>([]);
  const [replacementItems, setReplacementItems] = useState<ExchangeItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showVariantDialog, setShowVariantDialog] = useState(false);

  const returnTotal = returnedItems.reduce(
    (sum, i) => sum + (i.price * i.quantity - (i.discount || 0)),
    0,
  );

  const replacementTotal = replacementItems.reduce(
    (sum, i) => sum + i.price * i.quantity - (i.discount || 0),
    0,
  );

  const priceDifference = replacementTotal - returnTotal;
  const isRefundRequired = priceDifference < 0;

  useEffect(() => {
    const cacheKey = "neverbePOSPaymentMethodsCache";
    if (navigator.onLine) {
      api
        .get("/api/v1/pos/payment-methods")
        .then(({ data }) => {
          if (Array.isArray(data)) {
            setPaymentMethods(data.filter((m: any) => m.status));
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        })
        .catch((err) => {
          console.error("Failed to load payment methods", err);
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            setPaymentMethods(parsed.filter((m: any) => m.status));
          }
        });
    } else {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setPaymentMethods(parsed.filter((m: any) => m.status));
      }
    }
  }, []);

  const handleSearchOrder = async () => {
    if (!orderId.trim()) return;

    setLoading(true);
    setError(null);
    setOrderData(null);
    setEligible(false);
    setReturnedItems([]);
    setReplacementItems([]);
    setSearchQuery("");
    setSearchResults([]);

    try {
      const params: any = { orderId: orderId.trim() };
      if (selectedStockId) params.stockId = selectedStockId;

      const { data } = await api.get("/api/v1/pos/exchange", { params });

      if (data.eligible && data.order) {
        setEligible(true);
        setOrderData(data.order);
        setWorkingDays(data.workingDaysElapsed);
      } else {
        setError(data.message || "Order not eligible");
        setWorkingDays(data.workingDaysElapsed || null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to lookup order");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedStockId) return;

    setSearching(true);
    const cacheKey = `neverbePOSCachedProducts_${selectedStockId}`;
    try {
      if (navigator.onLine) {
        const { data } = await api.get("/api/v1/pos/products", {
          params: { stockId: selectedStockId, search: searchQuery },
        });
        setSearchResults(Array.isArray(data) ? data : []);
      } else {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const allProducts: any[] = JSON.parse(cached);
          const q = searchQuery.toLowerCase();
          const filtered = allProducts.filter(p => {
            const nameMatch = p.name?.toLowerCase().includes(q);
            const skuMatch = p.sku?.toLowerCase().includes(q);
            const brandMatch = p.brand?.toLowerCase().includes(q);
            const categoryMatch = p.category?.toLowerCase().includes(q);
            const variantMatch = p.variants?.some((v: any) =>
              v.name?.toLowerCase().includes(q) ||
              v.variantName?.toLowerCase().includes(q) ||
              v.color?.toLowerCase().includes(q) ||
              v.id?.toLowerCase().includes(q) ||
              v.variantId?.toLowerCase().includes(q)
            );
            return nameMatch || skuMatch || brandMatch || categoryMatch || variantMatch;
          });
          setSearchResults(filtered);
        }
      }
    } catch {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const allProducts: any[] = JSON.parse(cached);
        const q = searchQuery.toLowerCase();
        const filtered = allProducts.filter(p => {
          const nameMatch = p.name?.toLowerCase().includes(q);
          const skuMatch = p.sku?.toLowerCase().includes(q);
          const brandMatch = p.brand?.toLowerCase().includes(q);
          const categoryMatch = p.category?.toLowerCase().includes(q);
          const variantMatch = p.variants?.some((v: any) =>
            v.name?.toLowerCase().includes(q) ||
            v.variantName?.toLowerCase().includes(q) ||
            v.color?.toLowerCase().includes(q) ||
            v.id?.toLowerCase().includes(q) ||
            v.variantId?.toLowerCase().includes(q)
          );
          return nameMatch || skuMatch || brandMatch || categoryMatch || variantMatch;
        });
        setSearchResults(filtered);
      } else {
        toast.error("Product search failed");
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setShowVariantDialog(true);
  };

  const handleAddReplacement = (item: any) => {
    const index = replacementItems.findIndex(
      (r) =>
        r.itemId === item.itemId &&
        r.variantId === item.variantId &&
        r.size === item.size,
    );

    if (index >= 0) {
      const updated = [...replacementItems];
      updated[index].quantity += item.quantity;
      updated[index].discount =
        (updated[index].discount || 0) + (item.discount || 0);
      setReplacementItems(updated);
    } else {
      setReplacementItems([...replacementItems, item]);
    }

    setSearchQuery("");
    setSearchResults([]);
  };

  const addToReturn = (item: any) => {
    const existing = returnedItems.find(
      (r) =>
        r.itemId === item.itemId &&
        r.variantId === item.variantId &&
        r.size === item.size,
    );

    if (existing) {
      if (existing.quantity < item.quantity) {
        existing.quantity += 1;
        if (item.discount) {
          existing.discount =
            (item.discount / item.quantity) * existing.quantity;
        }
        setReturnedItems([...returnedItems]);
      }
    } else {
      setReturnedItems([
        ...returnedItems,
        {
          itemId: item.itemId,
          variantId: item.variantId,
          name: item.name,
          variantName: item.variantName || "",
          size: item.size,
          quantity: 1,
          price: item.price,
          discount: item.discount ? item.discount / item.quantity : 0,
          maxQuantity: item.quantity,
        },
      ]);
    }
  };

  const removeFromReturn = (item: ExchangeItem) => {
    if (item.quantity > 1) {
      item.quantity -= 1;
      if (item.discount) {
        const oldQty = item.quantity + 1;
        item.discount = (item.discount / oldQty) * item.quantity;
      }
      setReturnedItems([...returnedItems]);
    } else {
      setReturnedItems(
        returnedItems.filter(
          (r) =>
            !(
              r.itemId === item.itemId &&
              r.variantId === item.variantId &&
              r.size === item.size
            ),
        ),
      );
    }
  };

  const removeFromReplacement = (item: ExchangeItem) => {
    if (item.quantity > 1) {
      item.quantity -= 1;
      if (item.discount) {
        const oldQty = item.quantity + 1;
        item.discount = (item.discount / oldQty) * item.quantity;
      }
      setReplacementItems([...replacementItems]);
    } else {
      setReplacementItems(
        replacementItems.filter(
          (r) =>
            !(
              r.itemId === item.itemId &&
              r.variantId === item.variantId &&
              r.size === item.size
            ),
        ),
      );
    }
  };

  const handleProcessExchange = async () => {
    if (!returnedItems.length) {
      setError("Please select at least one item to return");
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          originalOrderId: orderData?.orderId,
          stockId: selectedStockId,
          returnedItems,
          replacementItems,
          notes,
          paymentMethod: priceDifference > 0 ? paymentMethod : "STORE_CREDIT",
        }),
      );

      const { data } = await api.post("/api/v1/pos/exchange", formData);

      if (data.success) setSuccess(true);
      else setError(data.message || "Exchange failed");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setOrderId("");
    setOrderData(null);
    setEligible(false);
    setError(null);
    setReturnedItems([]);
    setReplacementItems([]);
    setSearchQuery("");
    setSearchResults([]);
    setSuccess(false);
    setNotes("");
    onClose();
  };

  const returnColumns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => {
        const unitDiscount = (record.discount || 0) / (record.quantity || 1);
        const soldPrice = (record.price || 0) - unitDiscount;
        return (
          <div>
            <p className="font-semibold">{name}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 line-through">
                Rs. {record.price?.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-green-700">
                Rs. {soldPrice.toLocaleString()}
              </span>
            </div>
          </div>
        );
      },
    },
    { title: "Size", dataIndex: "size", key: "size" },
    {
      title: "Qty",
      key: "qty",
      render: (_: any, record: any) => {
        const returned = returnedItems.find(
          (r) =>
            r.itemId === record.itemId &&
            r.variantId === record.variantId &&
            r.size === record.size,
        );
        return `${returned?.quantity || 0} / ${record.quantity}`;
      },
    },
    {
      title: "",
      key: "action",
      render: (_: any, record: any) => {
        const returned = returnedItems.find(
          (r) =>
            r.itemId === record.itemId &&
            r.variantId === record.variantId &&
            r.size === record.size,
        );
        return (
          <div className="flex gap-1">
            <button
              onClick={() => returned && removeFromReturn(returned)}
              disabled={!returned}
              className="p-1 text-green-600 hover:text-green-800 disabled:text-gray-300"
            >
              <IconMinus size={16} />
            </button>
            <button
              onClick={() => addToReturn(record)}
              disabled={(returned?.quantity || 0) >= record.quantity}
              className="p-1 text-green-600 hover:text-green-800 disabled:text-gray-300"
            >
              <IconPlus size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  const replacementColumns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: ExchangeItem) => {
        const unitDiscount = (record.discount || 0) / (record.quantity || 1);
        const soldPrice = (record.price || 0) - unitDiscount;
        return (
          <div>
            <p className="font-semibold">{name}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 line-through">
                Rs. {record.price?.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-green-700">
                Rs. {soldPrice.toLocaleString()}
              </span>
            </div>
          </div>
        );
      },
    },
    { title: "Size", dataIndex: "size", key: "size" },
    { title: "Qty", dataIndex: "quantity", key: "quantity" },
    {
      title: "",
      key: "action",
      render: (_: any, record: ExchangeItem) => (
        <button
          onClick={() => removeFromReplacement(record)}
          className="p-1 text-red-500 hover:text-red-700"
        >
          <IconMinus size={16} />
        </button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={1000}
      footer={null}
      closeIcon={null}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 [&_.ant-modal-content]:!max-h-[90vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-neutral-100 bg-neutral-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white">
            <IconArrowsExchange size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 block mb-0.5">
              RETURN & EXCHANGE PROTOCOL
            </span>
            <h2 className="text-xl font-black text-white tracking-tight leading-tight">Item Exchange</h2>
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
      <div
        className="p-6 overflow-y-auto"
        style={{ maxHeight: "calc(90vh - 140px)" }}
      >
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <IconCheck size={36} />
            </div>
            <h3 className="text-xl font-black tracking-tight mt-2 text-neutral-900">EXCHANGE COMPLETED</h3>
            <p className="text-neutral-500 text-xs mt-1 font-medium">
              The exchange has been processed and inventory updated successfully.
            </p>
            {priceDifference < 0 ? (
              <div className="mt-5 p-5 rounded-2xl border border-emerald-300 bg-emerald-50 inline-block shadow-sm">
                <p className="font-black text-emerald-800 text-base">
                  STORE CREDIT CREATED: Rs. {Math.abs(priceDifference).toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 font-mono mt-0.5">
                  Order #{orderData?.orderId} • Store credit registered
                </p>
              </div>
            ) : priceDifference > 0 ? (
              <div className="mt-5 p-5 rounded-2xl border border-amber-300 bg-amber-50 inline-block shadow-sm">
                <p className="font-black text-amber-900 text-base">
                  CUSTOMER OWES: Rs. {priceDifference.toLocaleString()} ({paymentMethod})
                </p>
              </div>
            ) : (
              <div className="mt-5 p-5 rounded-2xl border border-neutral-300 bg-neutral-100 inline-block shadow-sm">
                <p className="font-black text-neutral-800 text-base">
                  EVEN EXCHANGE COMPLETED (NO BALANCE DUE)
                </p>
              </div>
            )}
            <Button
              type="primary"
              onClick={handleClose}
              className="mt-6 h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 block mx-auto"
            >
              Close
            </Button>
          </div>
        ) : !orderData ? (
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wider">
              Enter the order ID to look up and verify eligibility (within 14 working days)
            </p>
            <div className="flex gap-2">
              <Input
                size="large"
                placeholder="Enter Order ID (e.g., ORD-001)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onPressEnter={handleSearchOrder}
                className="rounded-xl font-mono font-bold"
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSearchOrder}
                loading={loading}
                disabled={!orderId.trim()}
                className="rounded-xl font-black text-xs uppercase tracking-wider shadow-md text-white !bg-black hover:!bg-neutral-800"
                style={{
                  minWidth: 100,
                }}
              >
                <IconSearch size={20} />
              </Button>
            </div>

            {error && (
              <Alert message={error} type="error" className="mt-3" showIcon />
            )}

            {workingDays !== null && !eligible && (
              <Alert
                message={`Order is ${workingDays} working days old. Exchange window is 14 working days.`}
                type="warning"
                className="mt-3"
                showIcon
                icon={<IconAlertCircle size={18} />}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Order Info */}
            <div className="p-3 border border-gray-200 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase">Order</p>
                <p className="text-lg font-extrabold">{orderData.orderId}</p>
              </div>
              <div className="text-right">
                <Tag color="green">{workingDays} working days ago</Tag>
                <p className="text-sm mt-1">
                  Total: Rs. {orderData.total?.toLocaleString()}
                </p>
              </div>
            </div>

            {error && <Alert message={error} type="error" showIcon />}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Items to Return */}
              <div>
                <p className="text-xs font-bold uppercase mb-2">
                  Items to Return
                </p>
                <Table
                  dataSource={orderData.items}
                  columns={returnColumns}
                  rowKey={(record, idx) =>
                    `${record.itemId}-${record.variantId}-${record.size}-${idx}`
                  }
                  size="small"
                  pagination={false}
                />
                <p className="font-bold mt-2">
                  Return Value: Rs. {returnTotal.toLocaleString()}
                </p>
              </div>

              {/* Right: Replacement Items */}
              <div>
                <p className="text-xs font-bold uppercase mb-2">
                  Replacement Items
                </p>
                <form
                  onSubmit={handleProductSearch}
                  className="flex gap-2 mb-3"
                >
                  <Input
                    placeholder="Search replacement product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-xl font-medium"
                  />
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={searching}
                    className="rounded-xl font-black text-xs uppercase tracking-wider shadow-md text-white !bg-black hover:!bg-neutral-800"
                  >
                    <IconSearch size={18} />
                  </Button>
                </form>

                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-xl mb-3 overflow-hidden">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className="p-2.5 cursor-pointer hover:bg-neutral-100 flex justify-between border-b border-neutral-100 last:border-b-0 transition-colors"
                      >
                        <p className="font-bold text-sm text-neutral-900">{prod.name}</p>
                        <p className="text-sm font-black text-neutral-900">
                          Rs. {prod.sellingPrice?.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {replacementItems.length > 0 ? (
                  <Table
                    dataSource={replacementItems}
                    columns={replacementColumns}
                    rowKey={(record, idx) =>
                      `${record.itemId}-${record.variantId}-${record.size}-${idx}`
                    }
                    size="small"
                    pagination={false}
                  />
                ) : (
                  <Alert
                    message="Select products to add as replacements"
                    type="info"
                  />
                )}
                <p className="font-black text-xs uppercase tracking-wider mt-2 text-neutral-800">
                  Replacement Value: <span className="font-mono text-sm">Rs. {replacementTotal.toLocaleString()}</span>
                </p>
              </div>
            </div>

            {/* Notes */}
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl font-medium"
            />

            {/* Price Difference Summary */}
            <div className="border-t border-neutral-100 pt-4 mt-2">
              <div
                className={`p-5 rounded-2xl border flex justify-between items-center shadow-sm ${
                  priceDifference < 0
                    ? "bg-emerald-50 border-emerald-300"
                    : priceDifference > 0
                    ? "bg-amber-50 border-amber-300"
                    : "bg-neutral-100 border-neutral-300"
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-black tracking-wider uppercase ${
                      priceDifference < 0
                        ? "text-emerald-800"
                        : priceDifference > 0
                        ? "text-amber-900"
                        : "text-neutral-800"
                    }`}
                  >
                    {priceDifference < 0
                      ? "EXCHANGE CREDIT CREATED"
                      : priceDifference > 0
                      ? "CUSTOMER OWES"
                      : "EVEN EXCHANGE (BALANCED)"}
                  </p>
                  {priceDifference < 0 && (
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      Store credit balance of Rs. {Math.abs(priceDifference).toLocaleString()} will be issued to customer.
                    </p>
                  )}
                </div>
                <p
                  className={`text-2xl font-black tracking-tight font-mono ${
                    priceDifference < 0
                      ? "text-emerald-700"
                      : priceDifference > 0
                      ? "text-amber-700"
                      : "text-neutral-700"
                  }`}
                >
                  Rs. {Math.abs(priceDifference).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Payment Method Selection for Outstanding Balance */}
            {priceDifference > 0 && (
              <div className="p-4 border border-neutral-200/80 rounded-2xl bg-neutral-50/50">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2.5 text-neutral-500">
                  Select Payment Method for Outstanding Balance
                </p>
                <div className="flex gap-2 flex-wrap">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.paymentId}
                      onClick={() => setPaymentMethod(pm.name)}
                      className={`px-4 py-2 border-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
                        paymentMethod === pm.name
                          ? "border-black bg-black text-white shadow-md shadow-black/10"
                          : "border-neutral-300 hover:border-black text-neutral-800 bg-white"
                      }`}
                    >
                      {pm.name}
                    </button>
                  ))}
                  {paymentMethods.length === 0 && (
                    <p className="text-red-500 text-xs">
                      No payment methods available.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {orderData && !success && (
        <div className="flex justify-end gap-3 p-5 border-t border-neutral-100 bg-neutral-50/50 rounded-b-3xl">
          <Button
            onClick={handleClose}
            className="h-12 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-600 hover:bg-neutral-200/70 border-transparent"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleProcessExchange}
            loading={processing}
            disabled={
              returnedItems.length === 0 ||
              (priceDifference > 0 && !paymentMethod)
            }
            className="h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 transition-all"
            style={{
              minWidth: 160,
            }}
          >
            PROCESS EXCHANGE
          </Button>
        </div>
      )}

      <POSVariantDialog
        open={showVariantDialog}
        onClose={() => setShowVariantDialog(false)}
        product={selectedProduct}
        onAddToCart={handleAddReplacement}
      />
    </Modal>
  );
}
