import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import POSVariantDialog from "./POSVariantDialog";

export default function POSProducts() {
  const { products, selectedStockId } = usePOS();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setVariantDialogOpen(true);
  };

  if (!selectedStockId) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
        <p className="text-gray-500">
          Please select a stock location to view products
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50">
        <p className="text-gray-500">
          No products available at this stock location
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-2 sm:p-4 lg:p-6 border-t border-gray-100 rounded-xl lg:rounded-3xl shadow-inner lg:mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5">
          {products.map((product: any) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="cursor-pointer transition-all duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-green-300 hover:-translate-y-1.5 flex flex-col overflow-hidden group"
            >
              {/* Product Image */}
              <div className="relative pt-[100%] bg-gray-50/50">
                <img
                  src={product.thumbnail?.url || "/placeholder.png"}
                  alt={product.name}
                  className="absolute top-0 left-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                />
                {product.discount > 0 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2.5 py-0.5 text-[0.7rem] font-bold rounded-full z-10 shadow-sm">
                    {product.discount}% OFF
                  </div>
                )}
                {product.variants?.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-md text-green-700 px-3 py-1 text-[0.7rem] font-extrabold rounded-full z-10 shadow-sm border border-green-100">
                    {product.variants.length} VARIANTS
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex flex-col flex-1 border-t border-gray-100 bg-white group-hover:bg-green-50/10 transition-colors">
                <span className="block text-gray-400 font-bold text-[0.65rem] tracking-widest uppercase mb-1">
                  {product.brand || "Neverbe"}
                </span>
                <h3
                  className="font-bold text-gray-800 text-sm md:text-base leading-snug mb-2 line-clamp-2 min-h-[2.8em]"
                  title={product.name}
                >
                  {product.name}
                </h3>

                <div className="mt-auto w-full pt-2">
                  <span className="block text-gray-400 font-bold text-[0.65rem] tracking-wider mb-1">
                    PRICE
                  </span>
                  <div className="flex flex-col xl:flex-row xl:items-baseline gap-1.xl:gap-2">
                    <span
                      className={`font-black text-lg ${
                        product.discount > 0 ? "text-red-500" : "text-gray-900"
                      }`}
                    >
                      <span className="text-[0.6em] mr-0.5 font-bold uppercase">
                        Rs.{" "}
                      </span>
                      {product.discount > 0
                        ? (
                            Math.round(
                              (product.sellingPrice *
                                (1 - product.discount / 100)) /
                                10,
                            ) * 10
                          ).toLocaleString()
                        : (product.sellingPrice || 0).toLocaleString()}
                    </span>
                    {product.discount > 0 && (
                      <span className="line-through text-gray-400 font-semibold text-xs xl:text-sm">
                        Rs. {product.sellingPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
