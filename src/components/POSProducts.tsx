import React, { useState, useMemo } from "react";
import { usePOS } from "../context/POSContext";
import POSVariantDialog from "./POSVariantDialog";
import { IconPackageOff, IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface POSDecoupledItem {
  key: string;
  product: any;
  variant: any | null;
  variantId?: string;
  variantName: string;
  thumbnail: string;
  brand: string;
  name: string;
  sellingPrice: number;
  finalPrice: number;
  discount: number;
  sizes: string[];
}

const getVariantThumbnail = (variant: any, product: any): string => {
  if (variant?.images?.[0]?.url) return variant.images[0].url;
  if (typeof variant?.images?.[0] === "string") return variant.images[0];
  if (variant?.thumbnail?.url) return variant.thumbnail.url;
  if (typeof variant?.thumbnail === "string") return variant.thumbnail;
  if (product?.thumbnail?.url) return product.thumbnail.url;
  if (typeof product?.thumbnail === "string") return product.thumbnail;
  return "/placeholder.png";
};

const formatVariantName = (variant: any): string => {
  if (!variant) return "";
  const name = variant.name || variant.variantName || variant.color;
  if (!name || name === "Default" || name.toLowerCase() === "default") return "";
  return name
    .split(" ")
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
};

export default function POSProducts() {
  const { products, selectedStockId, addItemToCart } = usePOS();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: any) => {
      const cat = p.category?.name || p.category || p.type;
      if (cat && typeof cat === "string") cats.add(cat.trim().toUpperCase());
    });
    return ["ALL", ...Array.from(cats)];
  }, [products]);

  // Decouple all product variants into individual item cards
  const displayedItems = useMemo(() => {
    const items: POSDecoupledItem[] = [];

    products.forEach((product: any) => {
      if (product.isDeleted || product.status === false) return;

      const cat = (
        product.category?.name ||
        product.category ||
        product.type ||
        ""
      ).toUpperCase();
      if (selectedCategory !== "ALL" && cat !== selectedCategory) {
        return;
      }

      const activeVariants = Array.isArray(product.variants)
        ? product.variants.filter((v: any) => !v.isDeleted && v.status !== false)
        : [];

      if (activeVariants.length > 0) {
        activeVariants.forEach((variant: any, idx: number) => {
          const discountPercent =
            (product.discount || 0) + (variant.discount || 0);
          const sellingPrice = product.sellingPrice || 0;
          const finalPrice =
            discountPercent > 0
              ? Math.round((sellingPrice * (1 - discountPercent / 100)) / 10) * 10
              : sellingPrice;

          const variantId = variant.id || variant.variantId || `v-${idx}`;
          const variantName = formatVariantName(variant);

          items.push({
            key: `${product.id}_${variantId}`,
            product,
            variant,
            variantId,
            variantName,
            thumbnail: getVariantThumbnail(variant, product),
            brand: product.brand || "NEVERBE",
            name: product.name,
            sellingPrice,
            finalPrice,
            discount: discountPercent,
            sizes: Array.isArray(variant.sizes) ? variant.sizes : [],
          });
        });
      } else {
        const discountPercent = product.discount || 0;
        const sellingPrice = product.sellingPrice || 0;
        const finalPrice =
          discountPercent > 0
            ? Math.round((sellingPrice * (1 - discountPercent / 100)) / 10) * 10
            : sellingPrice;

        items.push({
          key: `${product.id}_default`,
          product,
          variant: null,
          variantId: undefined,
          variantName: "",
          thumbnail: getVariantThumbnail(null, product),
          brand: product.brand || "NEVERBE",
          name: product.name,
          sellingPrice,
          finalPrice,
          discount: discountPercent,
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
        });
      }
    });

    return items;
  }, [products, selectedCategory]);

  // One-click direct add to cart for a specific size
  const handleDirectAddSize = async (item: POSDecoupledItem, size: string) => {
    if (!selectedStockId) {
      toast.error("Please select a stock location first");
      return;
    }

    const basePrice = item.product.sellingPrice || item.sellingPrice || 0;
    const autoDiscountPerUnit = Math.max(0, basePrice - item.finalPrice);

    let isMinusStock = false;
    try {
      const cached = localStorage.getItem(
        `neverbePOSInventoryCache_${selectedStockId}_${item.product.id}`
      );
      if (cached) {
        const inv = JSON.parse(cached);
        const match = inv.find(
          (i: any) =>
            (i.variantId === item.variantId || !item.variantId) &&
            i.size === size
        );
        if (match && match.quantity <= 0) {
          isMinusStock = true;
        }
      }
    } catch {
      // ignore
    }

    const itemData: any = {
      itemId: item.product.id,
      variantId: item.variantId,
      name: item.product.name,
      variantName: item.variantName || "Standard",
      thumbnail: item.thumbnail,
      size: size,
      discount: autoDiscountPerUnit * 1,
      type: "product",
      quantity: 1,
      price: item.product.sellingPrice,
      bPrice: item.product.buyingPrice || item.product.costPrice || 0,
      stockId: selectedStockId,
      isMinusStock,
    };

    try {
      await addItemToCart(itemData);
      toast.success(
        `Added ${item.name} (${item.variantName ? `${item.variantName} · ` : ""}Size ${size})`,
        { id: `cart-${item.key}-${size}`, duration: 1500 }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    }
  };

  // One-click direct add for items with no sizes
  const handleDirectAddItem = async (item: POSDecoupledItem) => {
    if (!selectedStockId) {
      toast.error("Please select a stock location first");
      return;
    }

    const basePrice = item.product.sellingPrice || item.sellingPrice || 0;
    const autoDiscountPerUnit = Math.max(0, basePrice - item.finalPrice);

    const itemData: any = {
      itemId: item.product.id,
      variantId: item.variantId,
      name: item.product.name,
      variantName: item.variantName || "Standard",
      thumbnail: item.thumbnail,
      size: "Standard",
      discount: autoDiscountPerUnit * 1,
      type: "product",
      quantity: 1,
      price: item.product.sellingPrice,
      bPrice: item.product.buyingPrice || item.product.costPrice || 0,
      stockId: selectedStockId,
      isMinusStock: false,
    };

    try {
      await addItemToCart(itemData);
      toast.success(
        `Added ${item.name}${item.variantName ? ` (${item.variantName})` : ""}`,
        { id: `cart-${item.key}`, duration: 1500 }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    }
  };

  // Card click handler:
  // - If item has no sizes: direct 1-click add
  // - If item has 1 size: direct 1-click add with that size
  // - If item has multiple sizes: opens streamlined dialog to pick size or configure quantity
  const handleCardClick = (item: POSDecoupledItem) => {
    if (!item.sizes || item.sizes.length === 0) {
      handleDirectAddItem(item);
      return;
    }
    if (item.sizes.length === 1) {
      handleDirectAddSize(item, item.sizes[0]);
      return;
    }
    setSelectedProduct(item.product);
    setSelectedVariantId(item.variantId);
    setSelectedSize(undefined);
    setVariantDialogOpen(true);
  };

  if (!selectedStockId) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-white rounded-2xl border border-neutral-200/80 p-8 text-center">
        <IconPackageOff size={48} className="text-zinc-300 mb-3" />
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-neutral-800">
          No Stock Location Selected
        </h3>
        <p className="text-xs font-medium text-zinc-400 mt-1 max-w-sm">
          Please select a stock location from the top header to view available inventory.
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-white rounded-2xl border border-neutral-200/80 p-8 text-center">
        <IconPackageOff size={48} className="text-zinc-300 mb-3" />
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-neutral-800">
          No Products Found
        </h3>
        <p className="text-xs font-medium text-zinc-400 mt-1 max-w-sm">
          There are currently no products available at this location or matching your search.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Category Pills Header Bar */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide shrink-0 px-0.5 justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap select-none ${
                  selectedCategory === cat
                    ? "bg-black text-white shadow-xs scale-[1.02]"
                    : "bg-white text-neutral-600 hover:text-black hover:bg-neutral-100 border border-neutral-200/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 pr-1 select-none">
            {displayedItems.length} {displayedItems.length === 1 ? "variant" : "variants"}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-100/50 p-3 sm:p-4 rounded-2xl border border-neutral-200/70 shadow-inner mt-1">
        {displayedItems.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center py-16 text-center">
            <IconPackageOff size={40} className="text-zinc-300 mb-2" />
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              No items in this category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {displayedItems.map((item) => (
              <div
                key={item.key}
                onClick={() => handleCardClick(item)}
                className="cursor-pointer transition-all duration-200 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-xl hover:border-black hover:-translate-y-1 flex flex-col overflow-hidden group select-none"
              >
                {/* Variant Thumbnail Section */}
                <div className="relative pt-[100%] bg-neutral-100/60 overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt={
                      item.variantName
                        ? `${item.name} - ${item.variantName}`
                        : item.name
                    }
                    className="absolute inset-0 w-full h-full object-contain p-3.5 transition-transform duration-300 group-hover:scale-108"
                    loading="lazy"
                  />
                  {item.discount > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-neutral-950 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md shadow-xs z-10">
                      -{item.discount}%
                    </div>
                  )}
                  {item.variantName && (
                    <div
                      className="absolute bottom-2.5 right-2.5 bg-neutral-950/90 backdrop-blur-md text-white px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-md shadow-xs border border-neutral-800 z-10 max-w-[130px] truncate"
                      title={item.variantName}
                    >
                      {item.variantName}
                    </div>
                  )}

                  {/* Athletic Quick Select Hover Action */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <IconPlus size={18} />
                    </span>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-3.5 flex flex-col flex-1 border-t border-neutral-100 bg-white">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="block text-zinc-400 font-extrabold text-[9px] tracking-widest uppercase truncate">
                      {item.brand || "NEVERBE"}
                    </span>
                    {item.variantName && (
                      <span
                        className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/80 truncate max-w-[110px]"
                        title={item.variantName}
                      >
                        {item.variantName}
                      </span>
                    )}
                  </div>

                  <h3
                    className="font-bold text-neutral-900 text-xs md:text-sm leading-snug mb-2 line-clamp-2 min-h-[2.6em] group-hover:text-black transition-colors"
                    title={
                      item.variantName
                        ? `${item.name} (${item.variantName})`
                        : item.name
                    }
                  >
                    {item.name}
                  </h3>

                  {/* Quick Size Select Pills - 1-Click Direct Add to Cart */}
                  {item.sizes.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-2.5 pt-0.5">
                      {item.sizes.map((size: string) => (
                        <button
                          key={size}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectAddSize(item, size);
                          }}
                          className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-black hover:text-white text-neutral-800 text-[10px] font-black border border-neutral-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title={`Add size ${size} to cart`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Price Row */}
                  <div className="mt-auto pt-2 border-t border-neutral-100 flex items-baseline justify-between gap-1 flex-wrap">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-black text-sm sm:text-base text-neutral-950 leading-none">
                        Rs. {item.finalPrice.toLocaleString()}
                      </span>
                      {item.discount > 0 && (
                        <span className="line-through text-zinc-400 font-semibold text-[11px]">
                          Rs. {item.sellingPrice?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Streamlined Size & Quantity Dialog (Focused on decoupled variant) */}
      <POSVariantDialog
        open={variantDialogOpen}
        onClose={() => {
          setVariantDialogOpen(false);
          setSelectedProduct(null);
          setSelectedVariantId(undefined);
          setSelectedSize(undefined);
        }}
        product={selectedProduct}
        initialVariantId={selectedVariantId}
        initialSize={selectedSize}
        hideVariantSelector={true}
      />
    </>
  );
}
