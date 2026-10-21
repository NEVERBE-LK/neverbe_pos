import React, { useState, useMemo } from "react";
import { usePOS } from "../context/POSContext";
import POSVariantDialog from "./POSVariantDialog";
import { IconPackageOff, IconPlus } from "@tabler/icons-react";

export default function POSProducts() {
  const { products, selectedStockId } = usePOS();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
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

  const displayedProducts = useMemo(() => {
    if (selectedCategory === "ALL") return products;
    return products.filter((p: any) => {
      const cat = (p.category?.name || p.category || p.type || "").toUpperCase();
      return cat === selectedCategory;
    });
  }, [products, selectedCategory]);

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide shrink-0 px-0.5">
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
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-100/50 p-3 sm:p-4 rounded-2xl border border-neutral-200/70 shadow-inner mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
          {displayedProducts.map((product: any) => {
            const finalPrice =
              product.discount > 0
                ? Math.round(
                    (product.sellingPrice * (1 - product.discount / 100)) / 10
                  ) * 10
                : product.sellingPrice || 0;

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="cursor-pointer transition-all duration-200 bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-xl hover:border-black hover:-translate-y-1 flex flex-col overflow-hidden group select-none"
              >
                {/* Product Image Section */}
                <div className="relative pt-[100%] bg-neutral-100/60 overflow-hidden">
                  <img
                    src={product.thumbnail?.url || "/placeholder.png"}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain p-3.5 transition-transform duration-300 group-hover:scale-108"
                    loading="lazy"
                  />
                  {product.discount > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-neutral-950 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md shadow-xs z-10">
                      -{product.discount}%
                    </div>
                  )}
                  {product.variants?.length > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md text-neutral-900 px-2 py-0.5 text-[9px] font-black tracking-wider rounded-md shadow-xs border border-neutral-200 z-10">
                      {product.variants.length} VARS
                    </div>
                  )}
                  {/* Athletic Quick Select Hover Action */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <IconPlus size={18} />
                    </span>
                  </div>
                </div>

                {/* Product Info Section */}
                <div className="p-3.5 flex flex-col flex-1 border-t border-neutral-100 bg-white">
                  <span className="block text-zinc-400 font-extrabold text-[9px] tracking-widest uppercase mb-1">
                    {product.brand || "NEVERBE"}
                  </span>
                  <h3
                    className="font-bold text-neutral-900 text-xs md:text-sm leading-snug mb-2 line-clamp-2 min-h-[2.6em] group-hover:text-black transition-colors"
                    title={product.name}
                  >
                    {product.name}
                  </h3>

                  <div className="mt-auto pt-2 border-t border-neutral-100 flex items-baseline justify-between gap-1 flex-wrap">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-black text-sm sm:text-base text-neutral-950 leading-none">
                        Rs. {finalPrice.toLocaleString()}
                      </span>
                      {product.discount > 0 && (
                        <span className="line-through text-zinc-400 font-semibold text-[11px]">
                          Rs. {product.sellingPrice?.toLocaleString()}
                        </span>
                      )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>

  {/* Variant Selection Dialog */}
      <POSVariantDialog
        open={variantDialogOpen}
        onClose={() => {
          setVariantDialogOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
    </>
  );
}
