import React, { useMemo, useState } from "react";
import { Button, Spin } from "antd";
import { IconTrash, IconReceipt, IconLoader2 } from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import toast from "react-hot-toast";

export default function POSInvoiceDetails() {
  const {
    items,
    invoiceId,
    isInvoiceLoading,
    removeItemFromCart,
    openPaymentDialog,
    todayOrdersCount,
  } = usePOS();

  // Track in-flight removal requests to prevent double-clicks
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Calculate totals
  const { subtotal, totalDiscount, grandTotal } = useMemo(() => {
    const subtotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const totalDiscount = items.reduce((acc, item) => acc + item.discount, 0);
    const grandTotal = subtotal - totalDiscount;
    return { subtotal, totalDiscount, grandTotal };
  }, [items]);

  const handleRemoveItem = async (item: any, index: number) => {
    const itemKey = `${item.itemId}-${item.variantId}-${item.size}-${index}`;
    
    // Prevent double removal if already in progress
    if (removingIds.has(itemKey)) return;

    setRemovingIds((prev) => new Set(prev).add(itemKey));
    try {
      await removeItemFromCart(item);
      toast.success("Item removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove item");
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    openPaymentDialog();
  };

  return (
    <div className="flex-1 flex flex-col rounded-xl lg:rounded-3xl shadow-sm border border-gray-100 overflow-hidden bg-white mt-1 lg:mt-0">
      {/* Header */}
      <div className="p-3 lg:p-5 bg-green-600 text-white flex justify-between items-center rounded-t-xl lg:rounded-t-3xl">
        <div className="flex items-center gap-2 lg:gap-3">
          <IconReceipt size={22} className="lg:w-[26px] lg:h-[26px]" />
          <h2 className="text-base lg:text-xl font-extrabold uppercase tracking-widest leading-tight">
            Current Order
          </h2>
          {todayOrdersCount !== undefined && (
            <span className="bg-blue-50 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-lg shrink-0 select-none shadow-sm">
              {todayOrdersCount}
            </span>
          )}
        </div>
        <span className="bg-white/20 text-white px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg lg:rounded-xl font-bold font-mono text-[10px] lg:text-sm backdrop-blur-md border border-white/10 shrink-0">
          #{invoiceId || "------"}
        </span>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto p-4 lg:p-5 bg-gray-50/30">
        {isInvoiceLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-gray-400">
            <IconReceipt size={72} stroke={1} className="text-gray-300 mb-2" />
            <p className="font-extrabold text-lg uppercase mt-4 text-gray-400 tracking-widest">
              CART IS EMPTY
            </p>
            <p className="text-sm font-medium text-gray-400 mt-2">
              Select products to add them to the cart
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div
                key={`${item.itemId}-${item.variantId}-${item.size}-${index}`}
                className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 transition-all hover:shadow-lg hover:border-green-300 group"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 shrink-0 bg-gray-50 rounded-xl p-2 border border-gray-100 flex items-center justify-center">
                  <img
                    src={item.thumbnail || "/placeholder.png"}
                    alt={item.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <p className="font-extrabold text-sm lg:text-base text-gray-800 line-clamp-2 leading-snug">
                    {item.name}
                  </p>
                  <p className="text-xs lg:text-sm text-gray-400 font-bold uppercase mt-1 tracking-wider">
                    {item.variantName} | Size: {item.size}
                  </p>
                  <div className="flex justify-between items-end mt-3 flex-wrap gap-2">
                    <span className="text-xs lg:text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                      Rs. {item.price.toLocaleString()} × {item.quantity}
                    </span>
                    <span className="text-base lg:text-lg font-black text-gray-900">
                      Rs.{" "}
                      {(
                        item.price * item.quantity -
                        (item.discount || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  {item.discount > 0 && (
                    <p className="text-xs lg:text-sm text-red-500 font-extrabold uppercase mt-2 tracking-wide">
                      Discount: -Rs. {item.discount.toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveItem(item, index)}
                  disabled={removingIds.has(`${item.itemId}-${item.variantId}-${item.size}-${index}`)}
                  className={`self-center transition-all p-2.5 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 shrink-0 ${
                    removingIds.has(`${item.itemId}-${item.variantId}-${item.size}-${index}`)
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  {removingIds.has(`${item.itemId}-${item.variantId}-${item.size}-${index}`) ? (
                    <IconLoader2 size={22} className="animate-spin" />
                  ) : (
                    <IconTrash size={22} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-5 lg:p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)] relative z-10 rounded-b-2xl lg:rounded-b-3xl">
        <div className="flex justify-between mb-3">
          <span className="text-sm lg:text-base text-gray-500 font-bold uppercase tracking-wider">
            Subtotal ({items.length} items)
          </span>
          <span className="text-sm lg:text-base font-extrabold text-gray-700">
            Rs. {subtotal.toLocaleString()}
          </span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between mb-3">
            <span className="text-sm lg:text-base text-red-500 font-bold uppercase tracking-wider">
              Total Discount
            </span>
            <span className="text-sm lg:text-base font-extrabold text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
              -Rs. {totalDiscount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="border-t-2 border-dashed border-gray-200 my-4" />
        <div className="flex justify-between items-end mb-6">
          <span className="text-base lg:text-lg font-black uppercase text-gray-900 tracking-widest">
            Grand Total
          </span>
          <span className="text-3xl lg:text-4xl font-black text-green-600 leading-none">
            Rs. {grandTotal.toLocaleString()}
          </span>
        </div>

        {/* Checkout Button */}
        <Button
          size="large"
          block
          disabled={items.length === 0}
          onClick={handleCheckout}
          className={`h-16 text-lg font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${
            items.length > 0
              ? "!bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-xl hover:shadow-green-500/40 !text-white !border-none hover:-translate-y-1"
              : "!bg-gray-200 !text-gray-400 !border-none"
          }`}
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
