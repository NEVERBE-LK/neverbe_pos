import React, { useState, useEffect } from "react";
import { Modal, Button, InputNumber, Spin, Tag } from "antd";
import { IconX, IconMinus, IconPlus } from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface POSVariantDialogProps {
  open: boolean;
  onClose: () => void;
  product: any;
  onAddToCart?: (item: any) => void;
}

export default function POSVariantDialog({
  open,
  onClose,
  product,
  onAddToCart,
}: POSVariantDialogProps) {
  const { selectedStockId, addItemToCart } = usePOS();

  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Calculate automatic discount and rounded price
  const basePrice = product?.sellingPrice || 0;
  const discountPercent =
    (product?.discount || 0) + (selectedVariant?.discount || 0);
  const priceAfterPercent = basePrice * (1 - discountPercent / 100);
  const roundedPrice = Math.round(priceAfterPercent / 10) * 10;
  const autoDiscountPerUnit = basePrice - roundedPrice;

  // Helper to format variant name
  const formatVariantName = (variant: any) => {
    if (!variant) return "Default";
    const name = variant.name || variant.variantName || variant.color;
    if (!name || name === "Default") return "Standard";

    // Capitalize first letter of each word
    return name
      .split(" ")
      .map(
        (word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(" ");
  };

  useEffect(() => {
    if (open && product && selectedStockId) {
      fetchInventory();
    }
  }, [open, product, selectedStockId]);

  useEffect(() => {
    if (open) {
      setSelectedVariant(product?.variants?.[0] || null);
      setSelectedSize("");
      setQuantity(1);
      setDiscount(0);
    }
  }, [open, product]);

  // Clear size when variant changes
  useEffect(() => {
    setSelectedSize("");
  }, [selectedVariant]);

  const fetchInventory = async () => {
    if (!product || !selectedStockId) return;
    setLoading(true);
    const cacheKey = `neverbePOSInventoryCache_${selectedStockId}_${product.id}`;
    try {
      if (navigator.onLine) {
        const { data } = await api.get("/api/v1/pos/inventory", {
          params: { stockId: selectedStockId, productId: product.id },
        });
        const invData = Array.isArray(data) ? data : [];
        setInventory(invData);
        localStorage.setItem(cacheKey, JSON.stringify(invData));
      } else {
        const cached = localStorage.getItem(cacheKey);
        setInventory(cached ? JSON.parse(cached) : []);
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      const cached = localStorage.getItem(cacheKey);
      setInventory(cached ? JSON.parse(cached) : []);
    } finally {
      setLoading(false);
    }
  };

  const getVariantSizes = () => {
    if (!selectedVariant) return [];

    const targetVariantId = selectedVariant.id || selectedVariant.variantId;

    // Use predefined sizes from the variant payload if available
    const variantSizes = Array.isArray(selectedVariant.sizes)
      ? selectedVariant.sizes
      : [];

    if (variantSizes.length > 0) {
      return variantSizes.map((sizeOption) => {
        const invMatch = inventory.find(
          (inv) => inv.variantId === targetVariantId && inv.size === sizeOption,
        );
        return {
          size: sizeOption,
          stock: invMatch ? invMatch.quantity : 0,
        };
      });
    }

    // Fallback: Use sizes directly from inventory if variant lacks a sizes array
    if (!inventory.length) return [];

    return inventory
      .filter((inv) => inv.variantId === targetVariantId)
      .map((inv) => ({
        size: inv.size,
        stock: inv.quantity,
      }));
  };

  const availableSizes = getVariantSizes();

  const getSelectedStock = () => {
    if (!selectedVariant || !selectedSize) return 0;
    const inv = inventory.find(
      (i) =>
        i.variantId === (selectedVariant.id || selectedVariant.variantId) &&
        i.size === selectedSize,
    );
    return inv?.quantity || 0;
  };

  const handleAddToCart = async () => {
    if (!selectedVariant || !selectedSize || !product) {
      toast.error("Please select variant and size");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const stockQty = getSelectedStock();
    if (quantity > stockQty) {
      toast("Warning: Quantity exceeds available stock", { icon: "⚠️" });
    }

    setAdding(true);
    try {
      const itemData = {
        itemId: product.id,
        variantId: selectedVariant.id || selectedVariant.variantId,
        name: product.name,
        variantName: formatVariantName(selectedVariant),
        thumbnail: selectedVariant.images?.[0]?.url || product.thumbnail || "",
        size: selectedSize,
        discount:
          (autoDiscountPerUnit + parseFloat(discount.toString() || "0")) *
          quantity,
        type: "product",
        quantity: quantity,
        price: product.sellingPrice,
        bPrice: product.buyingPrice,
        stockId: selectedStockId!,
      };

      if (onAddToCart) {
        onAddToCart(itemData);
      } else {
        await addItemToCart(itemData);
      }

      toast.success(onAddToCart ? "Added to exchange" : "Added to cart");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={650}
      footer={null}
      closeIcon={null}
      className="[&_.ant-modal-content]:!rounded-2xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-xl [&_.ant-modal-content]:!p-0"
    >
      {/* Header */}
      <div className="flex justify-between items-start p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-tight mb-1">
            {product.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-semibold">
              Rs. {product.sellingPrice?.toLocaleString()}
            </span>
            {product.discount > 0 && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide">
                {product.discount}% OFF
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2">
                  Select Variant
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.variants.map((variant: any) => {
                    const isSelected =
                      (selectedVariant?.id || selectedVariant?.variantId) ===
                      (variant.id || variant.variantId);
                    return (
                      <div
                        key={variant.id || variant.variantId}
                        onClick={() => {
                          setSelectedVariant(variant);
                          setSelectedSize("");
                        }}
                        className={`flex items-center gap-3 p-2 border-2 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "border-green-600 bg-green-50 shadow-sm"
                            : "border-gray-100 hover:border-green-300 bg-white"
                        }`}
                      >
                        <img
                          src={variant.images[0]?.url || product.thumbnail}
                          alt={variant.variantName || "variant"}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover border border-gray-100"
                        />
                        <div className="pr-2">
                          <p
                            className={`text-sm font-bold leading-tight ${isSelected ? "text-green-800" : "text-gray-700"}`}
                          >
                            {formatVariantName(variant)}
                          </p>
                          {(variant.discount > 0 || product.discount > 0) && (
                            <span className="inline-block mt-1 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 rounded-md">
                              {(variant.discount || 0) +
                                (product.discount || 0)}
                              % OFF
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2">
                Select Size
              </p>
              {availableSizes.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {availableSizes.map((sizeObj) => {
                    const isSelected = selectedSize === sizeObj.size;
                    const isOutOfStock = sizeObj.stock <= 0;
                    return (
                      <button
                        key={sizeObj.size}
                        onClick={() => setSelectedSize(sizeObj.size)}
                        className={`px-4 py-2 border-2 font-semibold text-sm rounded-xl transition-all ${
                          isSelected
                            ? "border-green-600 bg-green-50 text-green-700 shadow-sm"
                            : isOutOfStock
                              ? "border-orange-200 text-orange-600 hover:border-orange-400 hover:bg-orange-50 bg-white"
                              : "border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50/50 bg-white"
                        }`}
                      >
                        {sizeObj.size}{" "}
                        <span className="text-[10px] ml-1 opacity-70">
                          ({isOutOfStock ? "0" : sizeObj.stock})
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No sizes available for this variant
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2">
                Quantity
              </p>
              <div className="flex items-center gap-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-10 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-l-xl transition-all"
                >
                  <IconMinus size={16} />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-16 h-10 border-y border-gray-200 text-center font-bold focus:outline-none"
                  min={1}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-10 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-r-xl transition-all"
                >
                  <IconPlus size={16} />
                </button>
                <span className="ml-4 text-xs text-gray-500 font-bold uppercase tracking-wide">
                  Stock: {getSelectedStock()}
                </span>
                {quantity > getSelectedStock() && (
                  <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold uppercase">
                    Exceeds
                  </span>
                )}
              </div>
            </div>

            {/* Discount */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2">
                Discount (Rs.)
              </p>
              <InputNumber
                value={discount}
                onChange={(val) => setDiscount(Math.max(0, val || 0))}
                min={0}
                className="w-full font-semibold [&_.ant-input-number-input]:!h-10 rounded-xl"
                size="large"
              />
            </div>

            {/* Price Summary */}
            <div className="p-4 bg-green-50/50 border border-green-100 rounded-xl mt-2">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-gray-600">Original Price:</span>
                <span className="text-sm">
                  Rs. {basePrice.toLocaleString()}
                </span>
              </div>
              {autoDiscountPerUnit > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-green-600">
                    Auto Discount ({discountPercent}%):
                  </span>
                  <span className="text-sm text-green-600">
                    -Rs. {autoDiscountPerUnit.toLocaleString()}
                  </span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-orange-600">
                    Manual Discount:
                  </span>
                  <span className="text-sm text-orange-600">
                    -Rs. {discount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-gray-300">
                <span className="font-bold">Unit Price:</span>
                <span className="font-bold">
                  Rs. {(roundedPrice - discount).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm font-bold">
                  Rs. {(product.sellingPrice * quantity).toLocaleString()}
                </span>
              </div>
              {(discount > 0 || autoDiscountPerUnit > 0) && (
                <div className="flex justify-between text-red-500">
                  <span className="text-sm">Discount:</span>
                  <span className="text-sm font-bold">
                    -Rs.{" "}
                    {(
                      (autoDiscountPerUnit + discount) *
                      quantity
                    ).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t-2 border-gray-300">
                <span className="font-bold">Total:</span>
                <span className="font-extrabold text-green-700">
                  Rs. {((roundedPrice - discount) * quantity).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
        <Button
          onClick={onClose}
          className="h-12 px-6 rounded-xl font-medium text-gray-600 hover:bg-gray-100 border-transparent"
        >
          CANCEL
        </Button>
        <Button
          type="primary"
          onClick={handleAddToCart}
          disabled={!selectedVariant || !selectedSize || adding || loading}
          loading={adding}
          className="h-12 px-8 rounded-xl font-semibold shadow-sm text-sm tracking-wide"
          style={{
            backgroundColor:
              selectedVariant && selectedSize ? "#16a34a" : undefined,
            minWidth: 140,
          }}
        >
          ADD TO CART
        </Button>
      </div>
    </Modal>
  );
}
