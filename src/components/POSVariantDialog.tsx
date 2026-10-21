import React, { useState, useEffect } from "react";
import { Modal, Button, InputNumber, Spin, Tag } from "antd";
import { IconX, IconMinus, IconPlus, IconLock } from "@tabler/icons-react";
import { usePOS } from "../context/POSContext";
import toast from "react-hot-toast";
import api from "@/lib/api";
import POSCredentialVerifyAndRequestAuthorizeForm from "./POSCredentialVerifyAndRequestAuthorizeForm";

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

  // Manual discount security clearance
  const checkManualDiscountPermission = () => {
    const role = (localStorage.getItem("neverbePOSUserRole") || "").toLowerCase();
    if (role === "admin") return true;
    try {
      const perms = JSON.parse(localStorage.getItem("neverbePOSUserPermissions") || "[]");
      return Array.isArray(perms) && perms.includes("apply_manual_discount");
    } catch {
      return false;
    }
  };

  const [hasDiscountAuth, setHasDiscountAuth] = useState(false);
  const [showDiscountAuthModal, setShowDiscountAuthModal] = useState(false);
  const isDiscountAllowed = checkManualDiscountPermission() || hasDiscountAuth;

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

    if (discount > 0 && !isDiscountAllowed) {
      toast.error("Manual discount blocked: Security clearance required");
      setShowDiscountAuthModal(true);
      return;
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
    <>
    <Modal
      open={open}
      onCancel={onClose}
      width="min(920px, 95vw)"
      centered
      footer={null}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      className="[&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border-0 [&_.ant-modal-content]:!shadow-2xl [&_.ant-modal-content]:!p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-start px-6 py-5 border-b border-neutral-800 bg-neutral-950 text-white rounded-t-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
              PRODUCT SELECTOR
            </span>
            {product.discount > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider">
                {product.discount}% OFF
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-white tracking-tight leading-tight">
            {product.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base text-neutral-300 font-extrabold tracking-tight">
              Rs. {product.sellingPrice?.toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <IconX size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[calc(86vh-140px)] min-h-[440px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Product Image & Pricing Summary (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-100 shadow-xs">
                <img
                  src={selectedVariant?.images?.[0]?.url || product.thumbnail}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              </div>

              {/* Selected Attributes Chips */}
              <div className="flex flex-wrap gap-1.5">
                {selectedVariant && (
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-800 text-[11px] font-bold border border-neutral-200">
                    {formatVariantName(selectedVariant)}
                  </span>
                )}
                {selectedSize ? (
                  <span className="px-2.5 py-1 rounded-xl bg-neutral-900 text-white text-[11px] font-black">
                    Size: {selectedSize}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                    Select Size
                  </span>
                )}
              </div>

              {/* Price & Total Summary */}
              <div className="p-4 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl shadow-xs">
                <div className="flex justify-between mb-1.5 text-xs text-neutral-600 font-medium">
                  <span>Original Price:</span>
                  <span className="font-bold text-neutral-900">Rs. {basePrice.toLocaleString()}</span>
                </div>
                {autoDiscountPerUnit > 0 && (
                  <div className="flex justify-between mb-1.5 text-xs text-emerald-600 font-semibold">
                    <span>Auto Discount ({discountPercent}%):</span>
                    <span>-Rs. {autoDiscountPerUnit.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between mb-1.5 text-xs text-orange-600 font-semibold">
                    <span>Manual Discount:</span>
                    <span>-Rs. {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-neutral-200 text-xs">
                  <span className="font-bold text-neutral-700 uppercase">Unit Price:</span>
                  <span className="font-extrabold text-neutral-900">
                    Rs. {(roundedPrice - discount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-3 mt-3 border-t-2 border-neutral-900">
                  <span className="font-black text-xs uppercase tracking-wider text-neutral-900">Total Price:</span>
                  <span className="font-black text-2xl text-neutral-950 tracking-tight font-mono">
                    Rs. {((roundedPrice - discount) * quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Interactive Selections (7 cols) */}
            <div className="md:col-span-7 flex flex-col gap-5">
              {/* Variant Selection */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-2.5 font-mono">
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
                          className={`flex items-center gap-2.5 p-2 border-2 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? "border-black bg-neutral-950 text-white shadow-xs"
                              : "border-neutral-200 hover:border-black bg-white text-neutral-800"
                          }`}
                        >
                          <img
                            src={variant.images?.[0]?.url || product.thumbnail}
                            alt={variant.variantName || "variant"}
                            width={38}
                            height={38}
                            className="rounded-lg object-cover border border-neutral-200/50 bg-neutral-100"
                          />
                          <div className="pr-1.5">
                            <p
                              className={`text-xs font-black leading-tight ${isSelected ? "text-white" : "text-neutral-900"}`}
                            >
                              {formatVariantName(variant)}
                            </p>
                            {(variant.discount > 0 || product.discount > 0) && (
                              <span className={`inline-block mt-0.5 text-[9px] font-black px-1.5 py-0.2 rounded ${
                                isSelected 
                                  ? "bg-emerald-500/20 text-emerald-400" 
                                  : "bg-emerald-50 text-emerald-700"
                              }`}>
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
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-2.5 font-mono">
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
                          className={`px-3.5 py-2 border-2 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? "border-black bg-black text-white shadow-xs scale-[1.02]"
                              : isOutOfStock
                                ? "border-neutral-200 text-neutral-400 hover:border-neutral-400 bg-neutral-50"
                                : "border-neutral-200 text-neutral-800 hover:border-black bg-white"
                          }`}
                        >
                          {sizeObj.size}{" "}
                          <span className={`text-[10px] ml-1 font-bold ${isSelected ? "text-neutral-400" : isOutOfStock ? "text-red-500" : "text-neutral-500"}`}>
                            ({isOutOfStock ? "0" : sizeObj.stock})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 font-semibold italic">
                    No sizes available for this variant
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500 mb-2.5 font-mono">
                  Quantity
                </p>
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-l-xl transition-all active:scale-95 cursor-pointer"
                  >
                    <IconMinus size={16} />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-16 h-10 border-y border-neutral-300 text-center font-black text-base focus:outline-none bg-neutral-50/50"
                    min={1}
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-neutral-300 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-r-xl transition-all active:scale-95 cursor-pointer"
                  >
                    <IconPlus size={16} />
                  </button>
                  <span className="ml-4 text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    Stock: <strong className="text-black">{getSelectedStock()}</strong>
                  </span>
                  {quantity > getSelectedStock() && (
                    <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Exceeds
                    </span>
                  )}
                </div>
              </div>

              {/* Discount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500 font-mono">
                      Manual Discount (Rs.)
                    </p>
                    {!isDiscountAllowed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <IconLock size={10} /> Locked
                      </span>
                    )}
                  </div>
                  {!isDiscountAllowed && (
                    <button
                      type="button"
                      onClick={() => setShowDiscountAuthModal(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-neutral-900 underline hover:text-black cursor-pointer font-mono"
                    >
                      Authorize Clearance
                    </button>
                  )}
                </div>
                <InputNumber
                  value={discount}
                  onChange={(val) => {
                    if (!isDiscountAllowed) {
                      toast.error("Blocked: Security clearance 'apply_manual_discount' required");
                      setShowDiscountAuthModal(true);
                      return;
                    }
                    setDiscount(Math.max(0, val || 0));
                  }}
                  disabled={!isDiscountAllowed}
                  min={0}
                  placeholder={!isDiscountAllowed ? "Locked · Permission required" : "0"}
                  className={`w-full font-bold [&_.ant-input-number-input]:!h-10 rounded-xl ${
                    !isDiscountAllowed ? "!bg-neutral-100 !opacity-60 cursor-not-allowed" : ""
                  }`}
                  size="large"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-3xl">
        <Button
          onClick={onClose}
          className="h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-neutral-600 hover:bg-neutral-200/70 border-transparent"
        >
          CANCEL
        </Button>
        <Button
          type="primary"
          onClick={handleAddToCart}
          disabled={!selectedVariant || !selectedSize || adding || loading}
          loading={adding}
          className="h-11 px-8 rounded-xl font-black shadow-md text-xs uppercase tracking-widest text-white !bg-black hover:!bg-neutral-800 disabled:!bg-neutral-300 transition-all"
          style={{ minWidth: 160 }}
        >
          {onAddToCart ? "ADD TO EXCHANGE" : "ADD TO CART"}
        </Button>
      </div>
    </Modal>

    <POSCredentialVerifyAndRequestAuthorizeForm
      open={showDiscountAuthModal}
      onCancel={() => setShowDiscountAuthModal(false)}
      onSuccess={() => {
        setHasDiscountAuth(true);
        setShowDiscountAuthModal(false);
        toast.success("Manual discount clearance authorized");
      }}
      title="Authorize Manual Discount"
      description="Applying manual discounts requires supervisor or admin security clearance ('apply_manual_discount'). Please enter authorized credentials."
      requiredPermission="apply_manual_discount"
    />
  </>
  );
}
