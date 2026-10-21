import React, { useState } from "react";
import { Drawer, Empty, Tag, Button, Tooltip } from "antd";
import {
  IconBell,
  IconCheck,
  IconTruck,
  IconExternalLink,
  IconReceipt,
  IconClock,
  IconCash,
  IconCreditCard,
} from "@tabler/icons-react";
import { POSNotification } from "@/hooks/usePOSNotifications";
import { formatSLDate } from "@/utils/date";

interface POSNotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: POSNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenOrder: (orderId: string) => void;
}

export default function POSNotificationDrawer({
  open,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenOrder,
}: POSNotificationDrawerProps) {
  const [filter, setFilter] = useState<"ALL" | "COD" | "PAID">("ALL");

  const filtered = notifications.filter((n) => {
    if (filter === "ALL") return true;
    const meta = n.metadata || {};
    const method = (meta.paymentMethod || "").toLowerCase();
    const methodId = (meta.paymentMethodId || "").toUpperCase();
    const title = (n.title || "").toLowerCase();
    const msg = (n.message || "").toLowerCase();

    const isCod =
      method === "cod" ||
      methodId === "PM-001" ||
      method.includes("cash on delivery") ||
      title.includes("cod") ||
      msg.includes("cash on delivery");

    if (filter === "COD") return isCod;
    if (filter === "PAID") return !isCod;
    return true;
  });

  const handleProcessOrder = (n: POSNotification) => {
    if (!n.read) {
      onMarkAsRead(n.id);
    }
    const orderId = n.metadata?.orderId;
    if (orderId) {
      onOpenOrder(orderId);
      onClose();
    }
  };

  return (
    <Drawer
      title={
        <div className="flex flex-col gap-3 w-full py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black shadow-xs">
                <IconBell size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-tight uppercase text-xs text-neutral-900 font-mono">
                  Order Alerts
                </span>
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                  {unreadCount} Unread Notifications
                </span>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                type="text"
                size="small"
                icon={<IconCheck size={14} />}
                onClick={onMarkAllAsRead}
                className="text-neutral-900 font-extrabold text-[10px] uppercase tracking-wider hover:bg-neutral-100 rounded-lg px-2.5 font-mono"
              >
                Mark all
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
            {(["ALL", "COD", "PAID"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`flex-1 text-[10px] font-black uppercase tracking-wider h-8 rounded-lg transition-all font-mono cursor-pointer ${
                  filter === t
                    ? "bg-black text-white shadow-xs"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                {t === "PAID" ? "Paid Online" : t}
              </button>
            ))}
          </div>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={typeof window !== "undefined" && window.innerWidth < 640 ? "92%" : 540}
      styles={{ body: { padding: "16px", backgroundColor: "#f9fafb" } }}
    >
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-60">
          <IconBell size={40} className="text-neutral-300 mb-3" />
          <span className="text-xs font-black uppercase tracking-widest text-neutral-400 font-mono">
            No Order Alerts
          </span>
          <span className="text-[11px] font-medium text-neutral-400 mt-1 text-center max-w-[220px]">
            COD and confirmed Paid PayHere/Koko orders will alert here in real-time.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => {
            const meta = item.metadata || {};
            const isCod =
              (meta.paymentMethod || "").toLowerCase().includes("cod") ||
              (meta.paymentMethodId || "") === "PM-001" ||
              (item.title || "").toLowerCase().includes("cod");

            const formattedTime = formatSLDate(item.createdAt);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                  item.read
                    ? "bg-white/80 border-neutral-200 opacity-75"
                    : "bg-white border-neutral-300 shadow-sm"
                }`}
              >
                {!item.read && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-black" />
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isCod ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20 font-mono">
                          <IconCash size={12} />
                          COD Order
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-mono">
                          <IconCreditCard size={12} />
                          Paid ({meta.paymentMethod || "Online"})
                        </span>
                      )}
                    </div>
                    {formattedTime && (
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1">
                        <IconClock size={11} />
                        {formattedTime}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-neutral-900 font-mono m-0">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Metadata preview card */}
                  {(meta.orderId || meta.customerName || meta.total !== undefined) && (
                    <div className="mt-1 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 grid grid-cols-2 gap-2 text-[10px]">
                      {meta.orderId && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-widest font-mono text-[8px] block">
                            Order Ref
                          </span>
                          <span className="font-black text-neutral-900 font-mono">
                            #{meta.orderId}
                          </span>
                        </div>
                      )}
                      {meta.total !== undefined && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-widest font-mono text-[8px] block">
                            Total
                          </span>
                          <span className="font-black text-neutral-900 font-mono">
                            Rs. {Number(meta.total).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {meta.customerName && (
                        <div className="col-span-2">
                          <span className="text-neutral-400 uppercase tracking-widest font-mono text-[8px] block">
                            Customer
                          </span>
                          <span className="font-semibold text-neutral-800 truncate block">
                            {meta.customerName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-2 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleProcessOrder(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer font-mono"
                    >
                      <IconTruck size={13} />
                      Process Order
                    </button>
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(item.id)}
                        className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400 hover:text-black font-mono cursor-pointer"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
