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
      <div className="p-4 lg:p-5 bg-neutral-950 text-white flex justify-between items-center rounded-t-2xl border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <IconReceipt size={22} className="text-zinc-400" />
          <h2 className="text-sm lg:text-base font-black uppercase tracking-[0.16em] leading-tight text-white m-0">
            Current Order
          </h2>
          {todayOrdersCount !== undefined && (
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 select-none">
              #{todayOrdersCount} TODAY
            </span>
          )}
        </div>
        <span className="bg-white/10 text-white px-2.5 py-1 rounded-lg font-bold font-mono text-xs backdrop-blur-md border border-white/10 shrink-0">
          #{invoiceId || "------"}
        </span>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto p-3.5 lg:p-4 bg-neutral-50/60">
        {isInvoiceLoading ? (
          <div className="flex justify-center items-center h-full min-h-[220px]">
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full py-12 text-center select-none">
            <IconShoppingCartOff size={52} stroke={1.2} className="text-zinc-300 mb-3" />
            <p className="font-extrabold text-sm uppercase text-neutral-700 tracking-widest m-0">
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
                  className="flex gap-3.5 p-3.5 bg-white rounded-xl border border-neutral-200/80 transition-all hover:border-black hover:shadow-md group"
                >
                  <div className="w-14 h-14 lg:w-16 lg:h-16 shrink-0 bg-neutral-100/70 rounded-lg p-1.5 border border-neutral-200/60 flex items-center justify-center overflow-hidden">
                    <img
                      src={item.thumbnail || "/placeholder.png"}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <p className="font-bold text-xs lg:text-sm text-neutral-900 line-clamp-1 leading-snug m-0">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-extrabold uppercase mt-0.5 tracking-wider m-0">
                      {item.variantName} · SIZE {item.size}
                    </p>

                    <div className="flex justify-between items-baseline mt-2 flex-wrap gap-1">
                      <span className="text-[11px] font-semibold text-zinc-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        Rs. {item.price.toLocaleString()} × {item.quantity}
                      </span>
                      <span className="text-sm lg:text-base font-black text-neutral-950">
                        Rs. {(item.price * item.quantity - (item.discount || 0)).toLocaleString()}
                      </span>
                    </div>

                    {item.discount > 0 && (
                      <p className="text-[10px] text-emerald-600 font-extrabold uppercase mt-1 tracking-wide m-0">
                        Discount: -Rs. {item.discount.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item, index)}
                    disabled={isRemoving}
                    className={`self-center transition-all p-2 rounded-lg shrink-0 cursor-pointer ${
                      isRemoving
                        ? "text-zinc-300 cursor-not-allowed"
                        : "text-zinc-400 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    {isRemoving ? (
                      <IconLoader2 size={18} className="animate-spin" />
                    ) : (
                      <IconTrash size={18} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="p-4 lg:p-5 bg-white border-t border-neutral-200/80 shadow-[0_-10px_25px_-10px_rgba(0,0,0,0.03)] relative z-10 rounded-b-2xl">
        <div className="flex justify-between mb-2 text-xs">
          <span className="text-zinc-500 font-bold uppercase tracking-wider">
            Subtotal ({items.length} items)
          </span>
          <span className="font-extrabold text-neutral-800">
            Rs. {subtotal.toLocaleString()}
          </span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between mb-2 text-xs">
            <span className="text-emerald-600 font-bold uppercase tracking-wider">
              Total Discount
            </span>
            <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              -Rs. {totalDiscount.toLocaleString()}
            </span>
          </div>
        )}

        <div className="border-t border-dashed border-neutral-200 my-3" />

        <div className="flex justify-between items-baseline mb-4">
          <span className="text-xs lg:text-sm font-black uppercase text-neutral-900 tracking-widest">
            Grand Total
          </span>
          <span className="text-2xl lg:text-3xl font-black text-neutral-950 leading-none">
            Rs. {grandTotal.toLocaleString()}
          </span>
        </div>

        {/* High-Impact Athletic Checkout Button */}
        <Button
          size="large"
          block
          disabled={items.length === 0}
          onClick={handleCheckout}
          className={`h-13 text-xs lg:text-sm font-black uppercase tracking-[0.16em] rounded-xl transition-all duration-200 ${
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
