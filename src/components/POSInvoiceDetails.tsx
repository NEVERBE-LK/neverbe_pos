import React, { useMemo, useState } from "react";
import { Button, Spin } from "antd";
import { IconTrash, IconReceipt, IconLoader2, IconShoppingCartOff } from "@tabler/icons-react";
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
      0
    );
    const totalDiscount = items.reduce((acc, item) => acc + item.discount, 0);
    const grandTotal = subtotal - totalDiscount;
    return { subtotal, totalDiscount, grandTotal };
  }, [items]);

  const handleRemoveItem = async (item: any, index: number) => {
    const itemKey = `${item.itemId}-${item.variantId}-${item.size}-${index}`;

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
    <div className="flex-1 flex flex-col rounded-2xl shadow-sm border border-neutral-200/80 overflow-hidden bg-white mt-1 lg:mt-0">
      {/* Sportswear Terminal Header */}
      <div className="px-4 py-3.5 lg:px-5 lg:py-4 bg-neutral-950 text-white flex justify-between items-center rounded-t-2xl border-b border-neutral-800 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0">
            <IconReceipt size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs lg:text-sm font-black uppercase tracking-[0.16em] text-white leading-tight truncate m-0 font-mono">
              Current Order
            </h2>
            {todayOrdersCount !== undefined && (
              <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider block mt-0.5">
                #{todayOrdersCount} TODAY
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-neutral-900 text-neutral-200 px-3 py-1.5 rounded-xl font-bold font-mono text-xs border border-neutral-800 tracking-wider shadow-inner">
            #{invoiceId || "------"}
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 lg:p-4 bg-neutral-50/60">
        {isInvoiceLoading ? (
          <div className="flex justify-center items-center h-full min-h-[220px]">
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full py-16 text-center select-none">
            <div className="w-14 h-14 rounded-2xl bg-neutral-200/60 flex items-center justify-center text-neutral-400 mb-3">
              <IconShoppingCartOff size={28} stroke={1.5} />
            </div>
            <p className="font-extrabold text-sm uppercase text-neutral-700 tracking-widest m-0 font-mono">
              Cart is Empty
            </p>
            <p className="text-xs font-medium text-zinc-400 mt-1 max-w-[220px]">
              Tap or click products to add items to this order
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item, index) => {
              const itemKey = `${item.itemId}-${item.variantId}-${item.size}-${index}`;
              const isRemoving = removingIds.has(itemKey);

              return (
                <div
                  key={itemKey}
                  className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 transition-all hover:border-black hover:shadow-xs group flex flex-col gap-2"
                >
                  <div className="flex gap-3 items-center">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 lg:w-14 lg:h-14 shrink-0 bg-neutral-100 rounded-xl p-1 border border-neutral-200/70 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.thumbnail || "/placeholder.png"}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Title & Variant */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs lg:text-sm text-neutral-900 truncate leading-snug m-0">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-extrabold uppercase mt-0.5 tracking-wider truncate m-0 font-mono">
                        {item.variantName} · SIZE {item.size}
                      </p>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item, index)}
                      disabled={isRemoving}
                      className={`p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ${
                        isRemoving
                          ? "text-neutral-300 cursor-not-allowed"
                          : "text-neutral-400 hover:text-red-600 hover:bg-red-50"
                      }`}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      {isRemoving ? (
                        <IconLoader2 size={16} className="animate-spin" />
                      ) : (
                        <IconTrash size={16} />
                      )}
                    </button>
                  </div>

                  {/* Pricing row with ample space */}
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-neutral-100 mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md font-mono border border-neutral-200/60">
                        Rs. {item.price.toLocaleString()} × {item.quantity}
                      </span>
                      {item.discount > 0 && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                          -Rs. {item.discount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm lg:text-base font-black text-neutral-950 font-mono">
                      Rs. {(item.price * item.quantity - (item.discount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="p-4 lg:p-5 bg-white border-t border-neutral-200/80 shadow-[0_-10px_25px_-10px_rgba(0,0,0,0.03)] relative z-10 rounded-b-2xl shrink-0">
        <div className="flex justify-between mb-2 text-xs">
          <span className="text-neutral-500 font-bold uppercase tracking-wider font-mono text-[11px]">
            Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
          <span className="font-extrabold text-neutral-900 font-mono">
            Rs. {subtotal.toLocaleString()}
          </span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between mb-2 text-xs">
            <span className="text-neutral-500 font-bold uppercase tracking-wider font-mono text-[11px]">
              Total Discount
            </span>
            <span className="font-extrabold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 font-mono text-xs">
              -Rs. {totalDiscount.toLocaleString()}
            </span>
          </div>
        )}

        <div className="border-t border-dashed border-neutral-200 my-3" />

        <div className="flex justify-between items-baseline mb-4">
          <span className="text-xs lg:text-sm font-black uppercase text-neutral-900 tracking-widest font-mono">
            Grand Total
          </span>
          <span className="text-2xl lg:text-3xl font-black text-neutral-950 leading-none font-mono">
            Rs. {grandTotal.toLocaleString()}
          </span>
        </div>

        {/* High-Impact Athletic Checkout Button */}
        <Button
          size="large"
          block
          disabled={items.length === 0}
          onClick={handleCheckout}
          className={`h-12 text-xs lg:text-sm font-black uppercase tracking-[0.16em] rounded-xl transition-all duration-200 ${
            items.length > 0
              ? "!bg-black hover:!bg-neutral-800 active:!scale-99 !text-white !border-none shadow-md hover:shadow-xl cursor-pointer"
              : "!bg-neutral-200 !text-neutral-400 !border-none cursor-not-allowed"
          }`}
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
