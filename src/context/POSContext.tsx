import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { POSCartItem, POSProduct, POSStock, POSOrder } from "@/model/POSTypes";
import { auth } from "@/firebase/firebaseClient";
import api from "@/lib/api";
import toast from "react-hot-toast";

// ================================
// State Interface
// ================================
interface POSState {
  items: POSCartItem[];
  invoiceId: string | null;
  showPaymentDialog: boolean;
  isInvoiceLoading: boolean;
  products: POSProduct[];
  isProductsLoading: boolean;
  selectedStockId: string | null;
  stocks: POSStock[];
  isStocksLoading: boolean;
  showStockDialog: boolean;
  previewInvoice: boolean;
  previewOrder: POSOrder | null;
  isOnline: boolean;
  offlineQueue: any[];
  todayOrdersCount: number;
}

// ================================
// Actions
// ================================
type POSAction =
  | { type: "SET_ITEMS"; payload: POSCartItem[] }
  | { type: "CLEAR_ITEMS" }
  | { type: "SET_INVOICE_LOADING"; payload: boolean }
  | { type: "SET_SHOW_PAYMENT_DIALOG"; payload: boolean }
  | { type: "SET_PREVIEW_INVOICE"; payload: boolean }
  | { type: "SET_PREVIEW_ORDER"; payload: POSOrder | null }
  | { type: "SET_INVOICE_ID"; payload: string }
  | { type: "SET_SELECTED_STOCK_ID"; payload: string | null }
  | { type: "SET_SHOW_STOCK_DIALOG"; payload: boolean }
  | { type: "SET_STOCKS"; payload: POSStock[] }
  | { type: "SET_STOCKS_LOADING"; payload: boolean }
  | { type: "SET_PRODUCTS"; payload: POSProduct[] }
  | { type: "SET_PRODUCTS_LOADING"; payload: boolean }
  | { type: "SET_ONLINE"; payload: boolean }
  | { type: "SET_OFFLINE_QUEUE"; payload: any[] }
  | { type: "SET_TODAY_ORDERS_COUNT"; payload: number };

// ================================
// Context Interface
// ================================
interface POSContextType extends POSState {
  loadCart: (stockIdOverride?: string) => Promise<void>;
  addItemToCart: (item: POSCartItem) => Promise<void>;
  removeItemFromCart: (item: POSCartItem) => Promise<void>;
  loadStocks: () => Promise<void>;
  selectStock: (stockId: string) => void;
  loadProducts: (stockId: string) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  regenerateInvoiceId: () => void;
  openPaymentDialog: () => void;
  closePaymentDialog: () => void;
  openStockDialog: () => void;
  closeStockDialog: () => void;
  setPreview: (order: POSOrder | null) => void;
  closePreview: () => void;
  placePOSOrder: (order: any) => Promise<any>;
  fetchTodayOrdersCount: (stockId: string) => Promise<void>;
}

// ================================
// Initial State
// ================================
const initialState: POSState = {
  items: [],
  invoiceId: null,
  showPaymentDialog: false,
  isInvoiceLoading: false,
  products: [],
  isProductsLoading: false,
  selectedStockId: null,
  stocks: [],
  isStocksLoading: false,
  showStockDialog: false,
  previewInvoice: false,
  previewOrder: null,
  isOnline: true,
  offlineQueue: [],
  todayOrdersCount: 0,
};

// ================================
// Reducer
// ================================
const posReducer = (state: POSState, action: POSAction): POSState => {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.payload };
    case "CLEAR_ITEMS":
      return { ...state, items: [] };
    case "SET_INVOICE_LOADING":
      return { ...state, isInvoiceLoading: action.payload };
    case "SET_SHOW_PAYMENT_DIALOG":
      return { ...state, showPaymentDialog: action.payload };
    case "SET_PREVIEW_INVOICE":
      return { ...state, previewInvoice: action.payload };
    case "SET_PREVIEW_ORDER":
      return { ...state, previewOrder: action.payload };
    case "SET_INVOICE_ID":
      return { ...state, invoiceId: action.payload };
    case "SET_SELECTED_STOCK_ID":
      return { ...state, selectedStockId: action.payload };
    case "SET_SHOW_STOCK_DIALOG":
      return { ...state, showStockDialog: action.payload };
    case "SET_STOCKS":
      return { ...state, stocks: action.payload };
    case "SET_STOCKS_LOADING":
      return { ...state, isStocksLoading: action.payload };
    case "SET_PRODUCTS":
      return { ...state, products: action.payload };
    case "SET_PRODUCTS_LOADING":
      return { ...state, isProductsLoading: action.payload };
    case "SET_ONLINE":
      return { ...state, isOnline: action.payload };
    case "SET_OFFLINE_QUEUE":
      return { ...state, offlineQueue: action.payload };
    case "SET_TODAY_ORDERS_COUNT":
      return { ...state, todayOrdersCount: action.payload };
    default:
      return state;
  }
};

// ================================
// Utils
// ================================
const generateInvoiceId = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const randPart = Math.floor(100000 + Math.random() * 900000);
  return `${datePart}${randPart}`;
};

// ================================
// Context Creation
// ================================
const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(posReducer, initialState);

  // ================================
  // Async Actions (with Local Caching & Offline support)
  // ================================

  const loadStocks = useCallback(async () => {
    dispatch({ type: "SET_STOCKS_LOADING", payload: true });
    try {
      if (navigator.onLine && auth.currentUser) {
        const { data } = await api.get("/api/v1/pos/stocks");
        dispatch({ type: "SET_STOCKS", payload: data });
        localStorage.setItem("neverbePOSCachedStocks", JSON.stringify(data));
      } else {
        const cached = localStorage.getItem("neverbePOSCachedStocks");
        if (cached) {
          dispatch({ type: "SET_STOCKS", payload: JSON.parse(cached) });
        }
      }
    } catch (error) {
      console.error("Load Stocks Error:", error);
      const cached = localStorage.getItem("neverbePOSCachedStocks");
      if (cached) {
        dispatch({ type: "SET_STOCKS", payload: JSON.parse(cached) });
      } else {
        toast.error("Failed to load stocks");
      }
    } finally {
      dispatch({ type: "SET_STOCKS_LOADING", payload: false });
    }
  }, []);

  const loadProducts = useCallback(async (stockId: string) => {
    dispatch({ type: "SET_PRODUCTS_LOADING", payload: true });
    try {
      if (navigator.onLine && auth.currentUser) {
        const { data } = await api.get("/api/v1/pos/products", {
          params: { stockId, size: 10000 },
        });
        dispatch({ type: "SET_PRODUCTS", payload: data });
        localStorage.setItem(`neverbePOSCachedProducts_${stockId}`, JSON.stringify(data));
      } else {
        const cached = localStorage.getItem(`neverbePOSCachedProducts_${stockId}`);
        if (cached) {
          dispatch({ type: "SET_PRODUCTS", payload: JSON.parse(cached) });
        } else {
          toast.error("No cached products found for this location");
        }
      }
    } catch (error) {
      console.error("Load Products Error:", error);
      const cached = localStorage.getItem(`neverbePOSCachedProducts_${stockId}`);
      if (cached) {
        dispatch({ type: "SET_PRODUCTS", payload: JSON.parse(cached) });
      } else {
        toast.error("Failed to load products");
      }
    } finally {
      dispatch({ type: "SET_PRODUCTS_LOADING", payload: false });
    }
  }, []);

  const searchProducts = useCallback(
    async (query: string) => {
      if (!state.selectedStockId) return;
      dispatch({ type: "SET_PRODUCTS_LOADING", payload: true });
      try {
        if (navigator.onLine && auth.currentUser) {
          const { data } = await api.get("/api/v1/pos/products", {
            params: { stockId: state.selectedStockId, query },
          });
          dispatch({ type: "SET_PRODUCTS", payload: data });
        } else {
          const cached = localStorage.getItem(`neverbePOSCachedProducts_${state.selectedStockId}`);
          if (cached) {
            const allProducts: POSProduct[] = JSON.parse(cached);
            const q = query.toLowerCase();
            const filtered = allProducts.filter(p => {
              const nameMatch = p.name?.toLowerCase().includes(q);
              const skuMatch = p.sku?.toLowerCase().includes(q);
              const brandMatch = p.brand?.toLowerCase().includes(q);
              const categoryMatch = p.category?.toLowerCase().includes(q);
              const variantMatch = p.variants?.some(v =>
                v.name?.toLowerCase().includes(q) ||
                v.variantName?.toLowerCase().includes(q) ||
                v.color?.toLowerCase().includes(q) ||
                v.id?.toLowerCase().includes(q) ||
                v.variantId?.toLowerCase().includes(q)
              );
              return nameMatch || skuMatch || brandMatch || categoryMatch || variantMatch;
            });
            dispatch({ type: "SET_PRODUCTS", payload: filtered });
          }
        }
      } catch (error) {
        console.error("Search Products Error:", error);
        const cached = localStorage.getItem(`neverbePOSCachedProducts_${state.selectedStockId}`);
        if (cached) {
          const allProducts: POSProduct[] = JSON.parse(cached);
          const q = query.toLowerCase();
          const filtered = allProducts.filter(p => {
            const nameMatch = p.name?.toLowerCase().includes(q);
            const skuMatch = p.sku?.toLowerCase().includes(q);
            const brandMatch = p.brand?.toLowerCase().includes(q);
            const categoryMatch = p.category?.toLowerCase().includes(q);
            const variantMatch = p.variants?.some(v =>
              v.name?.toLowerCase().includes(q) ||
              v.variantName?.toLowerCase().includes(q) ||
              v.color?.toLowerCase().includes(q) ||
              v.id?.toLowerCase().includes(q) ||
              v.variantId?.toLowerCase().includes(q)
            );
            return nameMatch || skuMatch || brandMatch || categoryMatch || variantMatch;
          });
          dispatch({ type: "SET_PRODUCTS", payload: filtered });
        } else {
          toast.error("Failed to search products");
        }
      } finally {
        dispatch({ type: "SET_PRODUCTS_LOADING", payload: false });
      }
    },
    [state.selectedStockId],
  );

  const loadCart = useCallback(
    async (stockIdOverride?: string) => {
      const targetStockId = stockIdOverride || state.selectedStockId;
      if (!targetStockId) return;

      const localCart = localStorage.getItem(`neverbePOSCart_${targetStockId}`);
      const items = localCart ? JSON.parse(localCart) : [];
      dispatch({ type: "SET_ITEMS", payload: items });

      if (navigator.onLine && auth.currentUser) {
        try {
          const { data } = await api.get("/api/v1/pos/cart", {
            params: { stockId: targetStockId },
          });
          if (items.length === 0 && data.length > 0) {
            dispatch({ type: "SET_ITEMS", payload: data });
            localStorage.setItem(`neverbePOSCart_${targetStockId}`, JSON.stringify(data));
          }
        } catch (e) {
          console.warn("Background cart load failed, using local cart.", e);
        }
      }
    },
    [state.selectedStockId],
  );

  const addItemToCart = useCallback(
    async (item: POSCartItem) => {
      const targetStockId = state.selectedStockId;
      if (!targetStockId) return;

      const localCart = localStorage.getItem(`neverbePOSCart_${targetStockId}`);
      const items: POSCartItem[] = localCart ? JSON.parse(localCart) : [];
      const existingIdx = items.findIndex(i => i.variantId === item.variantId && i.size === item.size);

      if (existingIdx > -1) {
        items[existingIdx].quantity += item.quantity;
      } else {
        items.push(item);
      }

      localStorage.setItem(`neverbePOSCart_${targetStockId}`, JSON.stringify(items));
      dispatch({ type: "SET_ITEMS", payload: items });

      if (navigator.onLine && auth.currentUser) {
        try {
          const formData = new FormData();
          formData.append("data", JSON.stringify(item));
          await api.post("/api/v1/pos/cart", formData);
        } catch (error) {
          console.warn("Background cart sync failed", error);
        }
      }
    },
    [state.selectedStockId],
  );

  const removeItemFromCart = useCallback(
    async (item: POSCartItem) => {
      const targetStockId = state.selectedStockId;
      if (!targetStockId) return;

      const localCart = localStorage.getItem(`neverbePOSCart_${targetStockId}`);
      let items: POSCartItem[] = localCart ? JSON.parse(localCart) : [];
      const existingIdx = items.findIndex(i => i.variantId === item.variantId && i.size === item.size);

      if (existingIdx > -1) {
        items[existingIdx].quantity -= item.quantity;
        if (items[existingIdx].quantity <= 0) {
          items = items.filter(i => !(i.variantId === item.variantId && i.size === item.size));
        }
      }

      localStorage.setItem(`neverbePOSCart_${targetStockId}`, JSON.stringify(items));
      dispatch({ type: "SET_ITEMS", payload: items });

      if (navigator.onLine && auth.currentUser) {
        try {
          const formData = new FormData();
          formData.append("data", JSON.stringify(item));
          await api.delete("/api/v1/pos/cart", { data: formData });
        } catch (error) {
          console.warn("Background cart delete sync failed", error);
        }
      }
    },
    [state.selectedStockId],
  );

  const fetchTodayOrdersCount = useCallback(async (stockId: string) => {
    if (!stockId) return;
    try {
      if (navigator.onLine && auth.currentUser) {
        const { data } = await api.get("/api/v1/pos/orders/today-count", {
          params: { stockId },
        });
        const count = typeof data.count === "number" ? data.count : 0;
        dispatch({ type: "SET_TODAY_ORDERS_COUNT", payload: count });
        localStorage.setItem(`neverbePOSTodayOrdersCount_${stockId}`, String(count));
      } else {
        const cached = localStorage.getItem(`neverbePOSTodayOrdersCount_${stockId}`);
        dispatch({ type: "SET_TODAY_ORDERS_COUNT", payload: cached ? Number(cached) : 0 });
      }
    } catch (error) {
      console.error("Fetch Today Orders Count Error:", error);
      const cached = localStorage.getItem(`neverbePOSTodayOrdersCount_${stockId}`);
      dispatch({ type: "SET_TODAY_ORDERS_COUNT", payload: cached ? Number(cached) : 0 });
    }
  }, []);

  const selectStock = useCallback((stockId: string) => {
    dispatch({ type: "SET_SELECTED_STOCK_ID", payload: stockId });
    localStorage.setItem("neverbePOSStockId", stockId);
    dispatch({ type: "SET_SHOW_STOCK_DIALOG", payload: false });
    dispatch({ type: "SET_PRODUCTS", payload: [] });
    loadProducts(stockId);
    loadCart(stockId);
    fetchTodayOrdersCount(stockId);
  }, [loadProducts, loadCart, fetchTodayOrdersCount]);

  const regenerateInvoiceId = useCallback(() => {
    const newId = generateInvoiceId();
    dispatch({ type: "SET_INVOICE_ID", payload: newId });
    localStorage.setItem("posInvoiceId", newId);
  }, []);

  // ================================
  // Offline Sync Queue & Order Placing
  // ================================

  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || !auth.currentUser) return;
    const queueStr = localStorage.getItem("neverbePOSOfflineQueue");
    if (!queueStr) return;
    const queue: any[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    const toastId = toast.loading(`Syncing ${queue.length} offline orders...`);
    const remainingQueue: any[] = [];
    let successCount = 0;

    for (const order of queue) {
      try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(order));
        await api.post("/api/v1/pos/orders", formData);
        successCount++;
      } catch (error) {
        console.error("Failed to sync offline order", order.orderId, error);
        remainingQueue.push(order);
      }
    }

    localStorage.setItem("neverbePOSOfflineQueue", JSON.stringify(remainingQueue));
    dispatch({ type: "SET_OFFLINE_QUEUE", payload: remainingQueue });

    if (successCount > 0) {
      toast.success(`Successfully synced ${successCount} offline orders!`, { id: toastId });
      if (state.selectedStockId) {
        fetchTodayOrdersCount(state.selectedStockId);
      }
    } else {
      toast.dismiss(toastId);
    }
  }, [state.selectedStockId, fetchTodayOrdersCount]);

  const placePOSOrder = useCallback(
    async (order: any) => {
      if (navigator.onLine && auth.currentUser) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(order));
        const { data } = await api.post("/api/v1/pos/orders", formData);
        
        const targetStockId = state.selectedStockId;
        if (targetStockId) {
          localStorage.removeItem(`neverbePOSCart_${targetStockId}`);
        }
        dispatch({ type: "CLEAR_ITEMS" });

        if (state.selectedStockId) {
          fetchTodayOrdersCount(state.selectedStockId);
        }
        return data;
      } else {
        // Save to offline sync queue
        const queueStr = localStorage.getItem("neverbePOSOfflineQueue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push(order);
        localStorage.setItem("neverbePOSOfflineQueue", JSON.stringify(queue));
        dispatch({ type: "SET_OFFLINE_QUEUE", payload: queue });

        // Increment offline count immediately
        const nextCount = state.todayOrdersCount + 1;
        dispatch({ type: "SET_TODAY_ORDERS_COUNT", payload: nextCount });
        if (state.selectedStockId) {
          localStorage.setItem(`neverbePOSTodayOrdersCount_${state.selectedStockId}`, String(nextCount));
        }

        // Decrement local inventory size/variant caches immediately
        const targetStockId = state.selectedStockId;
        if (targetStockId) {
          // 1. Decrement products cached array totalStock
          const cachedProductsStr = localStorage.getItem(`neverbePOSCachedProducts_${targetStockId}`);
          if (cachedProductsStr) {
            const products: POSProduct[] = JSON.parse(cachedProductsStr);
            for (const item of order.items) {
              const prod = products.find(p => p.id === item.itemId);
              if (prod && prod.totalStock !== undefined) {
                prod.totalStock -= item.quantity;
              }
            }
            localStorage.setItem(`neverbePOSCachedProducts_${targetStockId}`, JSON.stringify(products));
            dispatch({ type: "SET_PRODUCTS", payload: products });
          }

          // 2. Decrement size-specific inventory cache
          for (const item of order.items) {
            const invCacheKey = `neverbePOSInventoryCache_${targetStockId}_${item.itemId}`;
            const cachedInvStr = localStorage.getItem(invCacheKey);
            if (cachedInvStr) {
              const inventoryList = JSON.parse(cachedInvStr);
              const invItem = inventoryList.find((inv: any) => inv.variantId === item.variantId && inv.size === item.size);
              if (invItem) {
                invItem.quantity -= item.quantity;
              }
              localStorage.setItem(invCacheKey, JSON.stringify(inventoryList));
            }
          }

          // Clear local cart
          localStorage.removeItem(`neverbePOSCart_${targetStockId}`);
        }
        dispatch({ type: "CLEAR_ITEMS" });

        // Return simulated backend response
        return {
          order: {
            ...order,
            id: order.orderId,
            createdAt: new Date().toISOString(),
          },
          isOffline: true,
        };
      }
    },
    [state.selectedStockId]
  );

  // ================================
  // Lifecycle Effects & Observers
  // ================================

  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: "SET_ONLINE", payload: true });
      toast.success("You are back online!");
      syncOfflineQueue();
    };
    const handleOffline = () => {
      dispatch({ type: "SET_ONLINE", payload: false });
      toast.error("You are offline. POS is running in offline mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    dispatch({ type: "SET_ONLINE", payload: navigator.onLine });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let invId = localStorage.getItem("posInvoiceId");
        if (!invId) {
          invId = generateInvoiceId();
          localStorage.setItem("posInvoiceId", invId);
        }
        dispatch({ type: "SET_INVOICE_ID", payload: invId });

        const queueStr = localStorage.getItem("neverbePOSOfflineQueue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        dispatch({ type: "SET_OFFLINE_QUEUE", payload: queue });

        loadStocks();

        const stockId = localStorage.getItem("neverbePOSStockId");
        if (stockId) {
          dispatch({ type: "SET_SELECTED_STOCK_ID", payload: stockId });
          loadProducts(stockId);
          loadCart(stockId);
          fetchTodayOrdersCount(stockId);
        } else {
          dispatch({ type: "SET_SHOW_STOCK_DIALOG", payload: true });
        }

        if (navigator.onLine) {
          syncOfflineQueue();
        }
      } else {
        dispatch({ type: "CLEAR_ITEMS" });
        dispatch({ type: "SET_PRODUCTS", payload: [] });
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadStocks, loadProducts, loadCart, syncOfflineQueue, fetchTodayOrdersCount]);

  // UI Actions
  const openPaymentDialog = useCallback(
    () => dispatch({ type: "SET_SHOW_PAYMENT_DIALOG", payload: true }),
    [],
  );
  const closePaymentDialog = useCallback(
    () => dispatch({ type: "SET_SHOW_PAYMENT_DIALOG", payload: false }),
    [],
  );
  const openStockDialog = useCallback(
    () => dispatch({ type: "SET_SHOW_STOCK_DIALOG", payload: true }),
    [],
  );
  const closeStockDialog = useCallback(
    () => dispatch({ type: "SET_SHOW_STOCK_DIALOG", payload: false }),
    [],
  );
  const setPreview = useCallback((order: POSOrder | null) => {
    dispatch({ type: "SET_PREVIEW_ORDER", payload: order });
    dispatch({ type: "SET_PREVIEW_INVOICE", payload: !!order });
  }, []);
  const closePreview = useCallback(() => {
    dispatch({ type: "SET_PREVIEW_INVOICE", payload: false });
    dispatch({ type: "SET_PREVIEW_ORDER", payload: null });
  }, []);

  return (
    <POSContext.Provider
      value={{
        ...state,
        loadCart,
        addItemToCart,
        removeItemFromCart,
        loadStocks,
        selectStock,
        loadProducts,
        searchProducts,
        regenerateInvoiceId,
        openPaymentDialog,
        closePaymentDialog,
        openStockDialog,
        closeStockDialog,
        setPreview,
        closePreview,
        placePOSOrder,
        fetchTodayOrdersCount,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOS must be used within a POSProvider");
  }
  return context;
};
