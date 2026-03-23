"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ClipboardList,
  Package,
  Percent,
  DollarSign,
  Gift,
  Star,
  Tag,
  X,
  CreditCard,
  User,
  ArrowLeft,
  Check,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, getItbmsBreakdown } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createSale,
  validateGiftCard,
  getOwnerLoyaltyBalance,
  topUpGiftCardAtPos,
  getOwnerUnbilledServices,
} from "./actions";
import type { UnbilledService } from "./actions";
import type { PaymentMethod, PromotionType, DiscountUnit } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

type CartItem = {
  key: string;
  productId?: string;
  serviceId?: string;
  giftCardProductId?: string;
  isGiftCard?: boolean;
  giftCardCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxExempt: boolean;
  discountAmount?: number;
  discountType?: "PERCENTAGE" | "FIXED";
};

type PosData = {
  products: {
    id: string;
    name: string;
    price: unknown;
    stock: number;
    isTaxExempt: boolean;
    category: string;
  }[];
  services: {
    id: string;
    name: string;
    price: unknown;
    isTaxExempt: boolean;
    type: string;
  }[];
  owners: { id: string; firstName: string; lastName: string }[];
  giftCardProducts: {
    id: string;
    name: string;
    amount: unknown;
    expirationDays: number | null;
  }[];
};

type Promotion = {
  id: string;
  name: string;
  type: PromotionType;
  value: unknown;
  minPurchase: unknown;
  maxDiscount: unknown;
  usageLimit: number | null;
  usageCount: number;
  appliesToAll: boolean;
  includedProducts: { productId: string }[];
  includedServices: { serviceId: string }[];
  // Buy X Get Y
  triggerProductId: string | null;
  triggerServiceId: string | null;
  rewardProductId: string | null;
  rewardServiceId: string | null;
  rewardDiscount: unknown;
  rewardDiscountUnit: DiscountUnit | null;
  // Bundle
  bundlePrice: unknown;
  // Volume tiers
  volumeTiers: { minQty: number; maxQty: number | null; discount: unknown; discountUnit: DiscountUnit }[];
};

type LoyaltyConfig = {
  isEnabled: boolean;
  dollarRate: number;
  expirationDays: number;
  minRedemption: number;
};

type PaymentLine = {
  id: string;
  method: PaymentMethod;
  amount: number;
  giftCardId?: string;
  giftCardCode?: string;
};

type AppliedPromo = {
  id: string;
  name: string;
  type: PromotionType;
  discountAmount: number;
};

interface PosTerminalProps {
  data: PosData;
  slug: string;
  promotions: Promotion[];
  loyaltyConfig: LoyaltyConfig;
  canDiscount: boolean;
  userId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcLineDiscount(item: CartItem): number {
  if (!item.discountAmount || item.discountAmount <= 0) return 0;
  const lineTotal = item.unitPrice * item.quantity;
  if (item.discountType === "PERCENTAGE") {
    return Math.min(lineTotal, (lineTotal * item.discountAmount) / 100);
  }
  return Math.min(lineTotal, item.discountAmount);
}

function evaluatePromotion(promo: Promotion, cart: CartItem[]): { applicable: boolean; discountAmount: number } {
  if (cart.length === 0) return { applicable: false, discountAmount: 0 };

  // Check usage limit
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
    return { applicable: false, discountAmount: 0 };
  }

  const value = Number(promo.value) || 0;
  const maxDiscount = promo.maxDiscount ? Number(promo.maxDiscount) : null;

  // Helper: get matching cart items
  const matchingItems = promo.appliesToAll
    ? cart
    : cart.filter((item) => {
        if (item.productId && promo.includedProducts.some((p) => p.productId === item.productId)) return true;
        if (item.serviceId && promo.includedServices.some((s) => s.serviceId === item.serviceId)) return true;
        return false;
      });

  if (promo.type === "DISCOUNT_PERCENTAGE" || promo.type === "DISCOUNT_FIXED") {
    if (matchingItems.length === 0) return { applicable: false, discountAmount: 0 };
    const matchingTotal = matchingItems.reduce((s, i) => s + i.unitPrice * i.quantity - calcLineDiscount(i), 0);
    // Check min purchase
    if (promo.minPurchase && matchingTotal < Number(promo.minPurchase)) return { applicable: false, discountAmount: 0 };
    let d = 0;
    if (promo.type === "DISCOUNT_PERCENTAGE") {
      d = (matchingTotal * value) / 100;
      if (maxDiscount && d > maxDiscount) d = maxDiscount;
    } else {
      d = Math.min(value, matchingTotal);
    }
    return { applicable: d > 0, discountAmount: Math.max(0, d) };
  }

  if (promo.type === "BUY_X_GET_Y") {
    const triggerId = promo.triggerProductId || promo.triggerServiceId;
    const rewardId = promo.rewardProductId || promo.rewardServiceId;
    if (!triggerId || !rewardId) return { applicable: false, discountAmount: 0 };
    const hasTrigger = cart.some((i) => i.productId === promo.triggerProductId || i.serviceId === promo.triggerServiceId);
    const rewardItem = cart.find((i) => i.productId === promo.rewardProductId || i.serviceId === promo.rewardServiceId);
    if (!hasTrigger || !rewardItem) return { applicable: false, discountAmount: 0 };
    const rewardDisc = Number(promo.rewardDiscount) || 0;
    const rewardPrice = rewardItem.unitPrice;
    let d = 0;
    if (promo.rewardDiscountUnit === "PERCENTAGE") {
      d = (rewardPrice * rewardDisc) / 100;
    } else {
      d = Math.min(rewardDisc, rewardPrice);
    }
    return { applicable: d > 0, discountAmount: Math.max(0, d) };
  }

  if (promo.type === "BUNDLE_PRICE") {
    const bundlePrice = Number(promo.bundlePrice) || 0;
    // All included items must be in cart
    const requiredProducts = promo.includedProducts.map((p) => p.productId);
    const requiredServices = promo.includedServices.map((s) => s.serviceId);
    const hasAllProducts = requiredProducts.every((pid) => cart.some((i) => i.productId === pid));
    const hasAllServices = requiredServices.every((sid) => cart.some((i) => i.serviceId === sid));
    if (!hasAllProducts || !hasAllServices) return { applicable: false, discountAmount: 0 };
    if (requiredProducts.length + requiredServices.length < 2) return { applicable: false, discountAmount: 0 };
    // Calculate total of bundle items at regular price
    const bundleItems = cart.filter(
      (i) => (i.productId && requiredProducts.includes(i.productId)) || (i.serviceId && requiredServices.includes(i.serviceId)),
    );
    const regularTotal = bundleItems.reduce((s, i) => s + i.unitPrice * 1, 0); // qty 1 each for bundle
    const d = Math.max(0, regularTotal - bundlePrice);
    return { applicable: d > 0, discountAmount: d };
  }

  if (promo.type === "VOLUME_DISCOUNT") {
    if (matchingItems.length === 0 || promo.volumeTiers.length === 0) return { applicable: false, discountAmount: 0 };
    let totalDisc = 0;
    for (const item of matchingItems) {
      const qty = item.quantity;
      const tier = promo.volumeTiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty));
      if (tier) {
        const lineTotal = item.unitPrice * qty;
        const tierDiscount = Number(tier.discount) || 0;
        if (tier.discountUnit === "PERCENTAGE") {
          totalDisc += (lineTotal * tierDiscount) / 100;
        } else {
          totalDisc += Math.min(tierDiscount * qty, lineTotal);
        }
      }
    }
    return { applicable: totalDisc > 0, discountAmount: totalDisc };
  }

  if (promo.type === "FREE_DELIVERY") {
    // Check if any matching grooming service is in cart
    if (matchingItems.length === 0) return { applicable: false, discountAmount: 0 };
    // Free delivery applies as a fixed value discount
    return { applicable: value > 0, discountAmount: value };
  }

  return { applicable: false, discountAmount: 0 };
}

let paymentIdCounter = 0;

// ─── Component ──────────────────────────────────────────────────────────────

export function PosTerminal({
  data,
  slug,
  promotions,
  loyaltyConfig,
  canDiscount,
  userId,
}: PosTerminalProps) {
  const router = useRouter();
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const base = `/app/${slug}/pos`;

  // ── Phase State ──
  const [phase, setPhase] = useState<"customer" | "services" | "terminal">("customer");
  const [customerSearch, setCustomerSearch] = useState("");
  const [unbilledServices, setUnbilledServices] = useState<UnbilledService[]>([]);
  const [selectedUnbilled, setSelectedUnbilled] = useState<Set<string>>(new Set());
  const [unbilledLoading, setUnbilledLoading] = useState(false);

  // ── Core State ──
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "services" | "giftCards">("products");
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Discount State ──
  const [txDiscountType, setTxDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [txDiscountValue, setTxDiscountValue] = useState("");
  const [showTxDiscount, setShowTxDiscount] = useState(false);
  const [lineDiscountKey, setLineDiscountKey] = useState<string | null>(null);
  const [lineDiscType, setLineDiscType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [lineDiscValue, setLineDiscValue] = useState("");

  // ── Auto-applied Promotions ──
  const [appliedPromos, setAppliedPromos] = useState<AppliedPromo[]>([]);

  // ── Gift Card State ──
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardError, setGiftCardError] = useState("");

  // ── Gift Card Top-Up State ──
  const [showTopUpGC, setShowTopUpGC] = useState(false);
  const [topUpGCCode, setTopUpGCCode] = useState("");
  const [topUpGCAmount, setTopUpGCAmount] = useState("");
  const [topUpGCMethod, setTopUpGCMethod] = useState<PaymentMethod>("CASH");
  const [topUpGCLoading, setTopUpGCLoading] = useState(false);
  const [topUpGCError, setTopUpGCError] = useState("");
  const [topUpGCResult, setTopUpGCResult] = useState<{ code: string; newBalance: number; saleNumber: number } | null>(null);

  // ── Loyalty State ──
  const [loyaltyBalance, setLoyaltyBalance] = useState<number | null>(null);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState("");
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // ── Payments State ──
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [newPayMethod, setNewPayMethod] = useState<PaymentMethod>("CASH");
  const [newPayAmount, setNewPayAmount] = useState("");

  // ── Filters ──
  const filteredProducts = useMemo(
    () =>
      data.products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [data.products, search],
  );
  const filteredServices = useMemo(
    () =>
      data.services.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [data.services, search],
  );

  // ── Gift Card Code Input (when selling a gift card) ──
  const [showGCInput, setShowGCInput] = useState(false);
  const [gcInputCode, setGcInputCode] = useState("");
  const [gcInputError, setGcInputError] = useState("");
  const [gcInputProduct, setGcInputProduct] = useState<PosData["giftCardProducts"][0] | null>(null);

  // ── Generated Gift Cards Modal ──
  const [showGCCodes, setShowGCCodes] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<{ code: string; amount: number }[]>([]);

  // ── Cart Functions ──
  function addGiftCardProduct(gcp: PosData["giftCardProducts"][0]) {
    setGcInputProduct(gcp);
    setGcInputCode("");
    setGcInputError("");
    setShowGCInput(true);
  }

  async function confirmGiftCardCode() {
    if (!gcInputProduct) return;
    const code = gcInputCode.trim().toUpperCase();
    if (!code) {
      setGcInputError(t("gcCodeRequired"));
      return;
    }
    // Check if this code is already in the cart
    if (cart.some((i) => i.giftCardCode === code)) {
      setGcInputError(t("gcCodeDuplicate"));
      return;
    }
    // Validate code isn't already active in the system
    const result = await validateGiftCard(code);
    if (result.valid) {
      setGcInputError(t("gcCodeAlreadyActive"));
      return;
    }
    const key = `gc-${gcInputProduct.id}-${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        key,
        giftCardProductId: gcInputProduct.id,
        isGiftCard: true,
        giftCardCode: code,
        description: `${gcInputProduct.name} (${code})`,
        quantity: 1,
        unitPrice: Number(gcInputProduct.amount),
        isTaxExempt: true,
      },
    ]);
    setShowGCInput(false);
    setGcInputProduct(null);
    setGcInputCode("");
  }

  function addProduct(p: PosData["products"][0]) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          key: `p-${p.id}`,
          productId: p.id,
          description: p.name,
          quantity: 1,
          unitPrice: Number(p.price),
          isTaxExempt: p.isTaxExempt,
        },
      ];
    });
  }

  function addService(s: PosData["services"][0]) {
    setCart((prev) => {
      const existing = prev.find((i) => i.serviceId === s.id);
      if (existing) return prev;
      return [
        ...prev,
        {
          key: `s-${s.id}`,
          serviceId: s.id,
          description: s.name,
          quantity: 1,
          unitPrice: Number(s.price),
          isTaxExempt: s.isTaxExempt,
        },
      ];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  // ── Line Discount ──
  function applyLineDiscount(key: string) {
    const val = parseFloat(lineDiscValue);
    if (isNaN(val) || val <= 0) return;
    setCart((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, discountAmount: val, discountType: lineDiscType }
          : i,
      ),
    );
    setLineDiscountKey(null);
    setLineDiscValue("");
  }

  function clearLineDiscount(key: string) {
    setCart((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, discountAmount: undefined, discountType: undefined }
          : i,
      ),
    );
  }

  // ── Per-line ITBMS calculations ──
  type LineCalc = {
    key: string;
    grossTotal: number;
    discount: number;
    afterDiscount: number;
    subtotalNoTax: number;
    itbms: number;
  };

  const lineCalcs: LineCalc[] = useMemo(
    () =>
      cart.map((item) => {
        const grossTotal = item.unitPrice * item.quantity;
        const discount = calcLineDiscount(item);
        const afterDiscount = grossTotal - discount;
        const breakdown = getItbmsBreakdown(afterDiscount, item.isTaxExempt);
        return {
          key: item.key,
          grossTotal,
          discount,
          afterDiscount,
          subtotalNoTax: breakdown.subtotal,
          itbms: breakdown.itbms,
        };
      }),
    [cart],
  );

  // ── Aggregate Calculations ──
  const cartGrossTotal = useMemo(
    () => lineCalcs.reduce((s, l) => s + l.grossTotal, 0),
    [lineCalcs],
  );
  const totalLineDiscounts = useMemo(
    () => lineCalcs.reduce((s, l) => s + l.discount, 0),
    [lineCalcs],
  );

  const afterLineDiscounts = cartGrossTotal - totalLineDiscounts;

  // Promo discounts
  const totalPromoDiscount = useMemo(
    () => appliedPromos.reduce((sum, p) => sum + p.discountAmount, 0),
    [appliedPromos],
  );

  const afterPromos = afterLineDiscounts - totalPromoDiscount;

  // Transaction discount
  const txDiscount = useMemo(() => {
    const val = parseFloat(txDiscountValue);
    if (isNaN(val) || val <= 0) return 0;
    if (txDiscountType === "PERCENTAGE") {
      return Math.min(afterPromos, (afterPromos * val) / 100);
    }
    return Math.min(afterPromos, val);
  }, [txDiscountType, txDiscountValue, afterPromos]);

  const totalDiscount = totalLineDiscounts + totalPromoDiscount + txDiscount;
  const afterAllDiscounts = afterPromos - txDiscount;

  // ITBMS: calculated on the final amount after all discounts, per-line proportionally
  const ticketSubtotalNoTax = useMemo(() => {
    // Sum of per-line subtotals (pre-tax) after line discounts
    const lineSubTotal = lineCalcs.reduce((s, l) => s + l.subtotalNoTax, 0);
    // Adjust for promo + tx discounts (proportional reduction of pre-tax)
    const promoAndTxDiscount = totalPromoDiscount + txDiscount;
    if (promoAndTxDiscount <= 0) return lineSubTotal;
    // The promo/tx discounts apply to the ITBMS-inclusive total, so back-calculate
    const promoTxBreakdown = getItbmsBreakdown(promoAndTxDiscount, false);
    return Math.max(0, lineSubTotal - promoTxBreakdown.subtotal);
  }, [lineCalcs, totalPromoDiscount, txDiscount]);

  const ticketItbms = useMemo(() => {
    const lineItbms = lineCalcs.reduce((s, l) => s + l.itbms, 0);
    const promoAndTxDiscount = totalPromoDiscount + txDiscount;
    if (promoAndTxDiscount <= 0) return lineItbms;
    const promoTxBreakdown = getItbmsBreakdown(promoAndTxDiscount, false);
    return Math.max(0, lineItbms - promoTxBreakdown.itbms);
  }, [lineCalcs, totalPromoDiscount, txDiscount]);

  // Loyalty redemption
  const loyaltyRedeemAmount = useMemo(() => {
    const val = parseFloat(loyaltyRedeem);
    if (isNaN(val) || val <= 0) return 0;
    return Math.min(val, loyaltyBalance ?? 0, afterAllDiscounts);
  }, [loyaltyRedeem, loyaltyBalance, afterAllDiscounts]);

  const finalTotal = afterAllDiscounts;

  // Payment tracking
  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0) + loyaltyRedeemAmount,
    [payments, loyaltyRedeemAmount],
  );
  const remainingToPay = Math.max(0, finalTotal - totalPaid);

  // ── Gift Card Payment Restriction ──
  const giftCardItemsTotal = useMemo(
    () => cart.filter((i) => i.isGiftCard).reduce((s, i) => s + i.unitPrice * i.quantity - calcLineDiscount(i), 0),
    [cart],
  );
  const maxGiftCardPayment = Math.max(0, finalTotal - giftCardItemsTotal);

  // ── Cash Calculator State ──
  const [showCashCalc, setShowCashCalc] = useState(false);
  const [cashDenominations, setCashDenominations] = useState<Record<number, number>>({});
  const cashDenominationValues = [100, 50, 20, 10, 5, 1, 0.25];
  const cashTotal = useMemo(
    () => Object.entries(cashDenominations).reduce((s, [d, count]) => s + parseFloat(d) * count, 0),
    [cashDenominations],
  );
  const cashChange = useMemo(
    () => Math.max(0, cashTotal - (remainingToPay > 0 ? remainingToPay : finalTotal - loyaltyRedeemAmount)),
    [cashTotal, remainingToPay, finalTotal, loyaltyRedeemAmount],
  );

  function addDenomination(d: number) {
    setCashDenominations((prev) => ({ ...prev, [d]: (prev[d] || 0) + 1 }));
  }
  function clearDenominations() {
    setCashDenominations({});
  }
  function confirmCashPayment() {
    const amountToPay = remainingToPay > 0 ? remainingToPay : finalTotal - loyaltyRedeemAmount;
    const payAmount = Math.min(cashTotal, amountToPay);
    if (payAmount <= 0) return;
    // If there are no payments yet, set as single; otherwise add
    if (payments.length === 0) {
      setPayments([{
        id: `pay-${++paymentIdCounter}`,
        method: "CASH",
        amount: payAmount,
      }]);
    } else {
      setPayments((prev) => [...prev, {
        id: `pay-${++paymentIdCounter}`,
        method: "CASH",
        amount: payAmount,
      }]);
    }
    setShowCashCalc(false);
    setCashDenominations({});
  }

  // ── Change Due Modal State ──
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [completedSaleNumber, setCompletedSaleNumber] = useState<number | null>(null);

  // ── Owner change → load loyalty ──
  const handleOwnerChange = useCallback(
    async (newOwnerId: string) => {
      setOwnerId(newOwnerId);
      setLoyaltyBalance(null);
      setLoyaltyRedeem("");
      if (newOwnerId && loyaltyConfig.isEnabled) {
        setLoyaltyLoading(true);
        try {
          const balance = await getOwnerLoyaltyBalance(newOwnerId);
          setLoyaltyBalance(balance);
        } catch {
          setLoyaltyBalance(0);
        } finally {
          setLoyaltyLoading(false);
        }
      }
    },
    [loyaltyConfig.isEnabled],
  );

  // ── Customer Selection ──
  const filteredOwners = useMemo(
    () =>
      customerSearch.trim()
        ? data.owners.filter((o) =>
            `${o.firstName} ${o.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()),
          )
        : data.owners,
    [data.owners, customerSearch],
  );

  async function selectCustomer(selectedOwnerId: string) {
    setOwnerId(selectedOwnerId);
    setCustomerSearch("");
    // Load loyalty
    if (selectedOwnerId && loyaltyConfig.isEnabled) {
      setLoyaltyLoading(true);
      try {
        const balance = await getOwnerLoyaltyBalance(selectedOwnerId);
        setLoyaltyBalance(balance);
      } catch {
        setLoyaltyBalance(0);
      } finally {
        setLoyaltyLoading(false);
      }
    }
    // Load unbilled services
    setUnbilledLoading(true);
    try {
      const services = await getOwnerUnbilledServices(selectedOwnerId);
      setUnbilledServices(services);
      // Auto-select completed ones
      const autoIds = new Set(services.filter((s) => s.autoAdd).map((s) => s.appointmentId));
      setSelectedUnbilled(autoIds);
      if (services.length > 0) {
        setPhase("services");
      } else {
        setPhase("terminal");
      }
    } catch {
      setUnbilledServices([]);
      setPhase("terminal");
    } finally {
      setUnbilledLoading(false);
    }
  }

  function selectWalkIn() {
    setOwnerId("");
    setCustomerSearch("");
    setUnbilledServices([]);
    setSelectedUnbilled(new Set());
    setPhase("terminal");
  }

  function confirmUnbilledServices() {
    // Add selected unbilled services to cart
    for (const svc of unbilledServices) {
      if (selectedUnbilled.has(svc.appointmentId) && svc.price > 0) {
        setCart((prev) => {
          // Skip if already in cart
          if (prev.some((i) => i.key === `appt-${svc.appointmentId}`)) return prev;
          return [
            ...prev,
            {
              key: `appt-${svc.appointmentId}`,
              serviceId: svc.serviceId ?? undefined,
              description: `${svc.serviceName} — ${svc.petName}`,
              quantity: 1,
              unitPrice: svc.price,
              isTaxExempt: svc.isTaxExempt,
            },
          ];
        });
      }
    }
    setPhase("terminal");
  }

  function resetToCustomerPhase() {
    setPhase("customer");
    setCart([]);
    setOwnerId("");
    setCustomerSearch("");
    setPayments([]);
    setAppliedPromos([]);
    setTxDiscountValue("");
    setShowTxDiscount(false);
    setLoyaltyRedeem("");
    setLoyaltyBalance(null);
    setGiftCardCode("");
    setSearch("");
    setUnbilledServices([]);
    setSelectedUnbilled(new Set());
  }

  // ── Auto-apply promotions when cart changes ──
  useEffect(() => {
    if (cart.length === 0) {
      setAppliedPromos([]);
      return;
    }
    const applied: AppliedPromo[] = [];
    for (const promo of promotions) {
      const result = evaluatePromotion(promo, cart);
      if (result.applicable && result.discountAmount > 0) {
        applied.push({
          id: promo.id,
          name: promo.name,
          type: promo.type,
          discountAmount: result.discountAmount,
        });
      }
    }
    setAppliedPromos(applied);
  }, [cart, promotions]);

  // ── Gift Card ──
  async function handleApplyGiftCard() {
    if (!giftCardCode.trim()) return;
    setGiftCardError("");

    // Check if gift card payment is allowed (can't pay for gift card items with gift card)
    const existingGCPayment = payments
      .filter((p) => p.method === "GIFT_CARD")
      .reduce((s, p) => s + p.amount, 0);
    if (existingGCPayment >= maxGiftCardPayment) {
      setGiftCardError(t("cannotPayGiftCardWithGiftCard"));
      return;
    }

    // Check not already added
    if (payments.some((p) => p.giftCardCode === giftCardCode.trim())) {
      setGiftCardError(t("giftCardInvalid"));
      return;
    }

    try {
      const result = await validateGiftCard(giftCardCode.trim());
      if (!result.valid) {
        setGiftCardError(result.reason || t("giftCardInvalid"));
        return;
      }
      const availableForGC = maxGiftCardPayment - existingGCPayment;
      const applyAmount = Math.min(result.balance!, remainingToPay || finalTotal, availableForGC);
      if (applyAmount <= 0) {
        setGiftCardError(t("giftCardInsufficient"));
        return;
      }
      setPayments((prev) => [
        ...prev,
        {
          id: `gc-${++paymentIdCounter}`,
          method: "GIFT_CARD" as PaymentMethod,
          amount: applyAmount,
          giftCardId: result.id,
          giftCardCode: giftCardCode.trim(),
        },
      ]);
      setGiftCardCode("");
    } catch {
      setGiftCardError(t("giftCardInvalid"));
    }
  }

  // ── Payments ──
  function addPayment() {
    const amount = parseFloat(newPayAmount);
    if (isNaN(amount) || amount <= 0) return;
    setPayments((prev) => [
      ...prev,
      {
        id: `pay-${++paymentIdCounter}`,
        method: newPayMethod,
        amount: Math.min(amount, remainingToPay),
      },
    ]);
    setNewPayAmount("");
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  function handleQuickPay(method: PaymentMethod) {
    if (method === "CASH") {
      // Open cash calculator
      setCashDenominations({});
      setShowCashCalc(true);
      return;
    }
    if (payments.length === 0) {
      // First payment — pay full amount
      setPayments([
        {
          id: `pay-${++paymentIdCounter}`,
          method,
          amount: finalTotal - loyaltyRedeemAmount,
        },
      ]);
    } else if (remainingToPay > 0.01) {
      // Split payment — add remaining amount
      setPayments((prev) => [
        ...prev,
        {
          id: `pay-${++paymentIdCounter}`,
          method,
          amount: remainingToPay,
        },
      ]);
    }
  }

  // ── Charge ──
  async function handleCharge() {
    if (cart.length === 0 || remainingToPay > 0.01) return;
    setLoading(true);
    try {
      const allPayments: { method: PaymentMethod; amount: number; giftCardId?: string }[] =
        payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          giftCardId: p.giftCardId,
        }));

      // Calculate if cash payment has change due
      const cashPayment = payments.find((p) => p.method === "CASH");
      const overpaid = totalPaid - finalTotal;
      const hasCashChange = cashPayment && overpaid > 0.005;

      const result = await createSale({
        ownerId: ownerId || undefined,
        items: cart.map(({ key, ...rest }) => rest),
        payments: allPayments,
        promotionIds: appliedPromos.map((p) => p.id),
        transactionDiscount:
          txDiscount > 0
            ? { type: txDiscountType, value: parseFloat(txDiscountValue) }
            : undefined,
        loyaltyRedeem: loyaltyRedeemAmount > 0 ? loyaltyRedeemAmount : undefined,
        notes: undefined,
        discountedById: totalDiscount > 0 ? userId : undefined,
      });

      // Show generated gift card codes if any
      if (result.generatedGiftCards && result.generatedGiftCards.length > 0) {
        setGeneratedCodes(result.generatedGiftCards);
        setShowGCCodes(true);
      }

      if (hasCashChange) {
        // Show change modal
        setChangeAmount(Math.round(overpaid * 100) / 100);
        setCompletedSaleNumber(result.saleNumber);
        setShowChangeModal(true);
      }

      // Reset POS to customer selection phase
      setPhase("customer");
      setCart([]);
      setOwnerId("");
      setCustomerSearch("");
      setPayments([]);
      setAppliedPromos([]);
      setTxDiscountValue("");
      setShowTxDiscount(false);
      setLoyaltyRedeem("");
      setLoyaltyBalance(null);
      setGiftCardCode("");
      setSearch("");
      setUnbilledServices([]);
      setSelectedUnbilled(new Set());

      if (!hasCashChange && !(result.generatedGiftCards && result.generatedGiftCards.length > 0)) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  function closeChangeModal() {
    setShowChangeModal(false);
    setChangeAmount(0);
    setCompletedSaleNumber(null);
    router.refresh();
  }

  // ── Gift Card Top-Up ──
  async function handleTopUpGiftCard() {
    const amount = parseFloat(topUpGCAmount);
    if (!topUpGCCode.trim() || !amount || amount <= 0) return;
    setTopUpGCLoading(true);
    setTopUpGCError("");
    try {
      const result = await topUpGiftCardAtPos({
        code: topUpGCCode.trim().toUpperCase(),
        amount,
        paymentMethod: topUpGCMethod,
      });
      setTopUpGCResult(result);
    } catch (err: unknown) {
      setTopUpGCError(err instanceof Error ? err.message : "Error topping up");
    } finally {
      setTopUpGCLoading(false);
    }
  }

  function closeTopUpGCDialog() {
    setShowTopUpGC(false);
    setTopUpGCCode("");
    setTopUpGCAmount("");
    setTopUpGCMethod("CASH");
    setTopUpGCError("");
    setTopUpGCResult(null);
  }

  // ── Payment method labels ──
  function methodLabel(m: PaymentMethod) {
    const labels: Record<string, string> = {
      CASH: t("cash"),
      CARD: t("card"),
      YAPPY: t("yappy"),
      BANK_TRANSFER: t("bankTransfer"),
      GIFT_CARD: t("giftCard"),
      LOYALTY: t("loyalty"),
    };
    return labels[m] || m;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")}>
        <Link href={`${base}/sales`}>
          <Button variant="outline" size="sm">
            {t("salesHistory")}
          </Button>
        </Link>
      </PageHeader>

      {/* ═══ PHASE: Customer Selection ═══ */}
      {phase === "customer" && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="text-center space-y-1">
              <User className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t("selectCustomer")}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchCustomer")}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-1">
              {filteredOwners.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("noCustomerResults")}
                </p>
              ) : (
                filteredOwners.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => selectCustomer(o.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3"
                    disabled={unbilledLoading}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {o.firstName[0]}{o.lastName[0]}
                    </div>
                    <span className="text-sm font-medium">{o.firstName} {o.lastName}</span>
                  </button>
                ))
              )}
            </div>
            <div className="border-t pt-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={selectWalkIn}
              >
                <ShoppingCart className="h-4 w-4" />
                {t("walkIn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ PHASE: Unbilled Services Review ═══ */}
      {phase === "services" && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setPhase("customer"); setOwnerId(""); }} className="hover:bg-muted rounded p-1">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-lg font-semibold">{t("unbilledServices")}</h2>
                <p className="text-xs text-muted-foreground">{t("unbilledServicesDesc")}</p>
              </div>
            </div>

            {/* Customer badge */}
            {ownerId && (() => {
              const owner = data.owners.find((o) => o.id === ownerId);
              return owner ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {owner.firstName[0]}{owner.lastName[0]}
                  </div>
                  <span className="text-sm font-medium">{owner.firstName} {owner.lastName}</span>
                </div>
              ) : null;
            })()}

            {/* Completed services (auto-added) */}
            {unbilledServices.filter((s) => s.autoAdd).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-green-700 dark:text-green-400">{t("completedServices")}</span>
                {unbilledServices.filter((s) => s.autoAdd).map((svc) => (
                  <label
                    key={svc.appointmentId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnbilled.has(svc.appointmentId)}
                      onChange={(e) => {
                        setSelectedUnbilled((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(svc.appointmentId);
                          else next.delete(svc.appointmentId);
                          return next;
                        });
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{svc.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{t("petLabel")}: {svc.petName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">
                        <Check className="h-3 w-3 mr-0.5" />
                        {svc.status}
                      </Badge>
                      <span className="text-sm font-semibold">{formatCurrency(svc.price)}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Pending/In-progress services (optional) */}
            {unbilledServices.filter((s) => !s.autoAdd).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">{t("pendingServices")}</span>
                {unbilledServices.filter((s) => !s.autoAdd).map((svc) => (
                  <label
                    key={svc.appointmentId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnbilled.has(svc.appointmentId)}
                      onChange={(e) => {
                        setSelectedUnbilled((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(svc.appointmentId);
                          else next.delete(svc.appointmentId);
                          return next;
                        });
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{svc.serviceName}</p>
                      <p className="text-xs text-muted-foreground">{t("petLabel")}: {svc.petName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-0.5" />
                        {svc.status}
                      </Badge>
                      <span className="text-sm font-semibold">{formatCurrency(svc.price)}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setSelectedUnbilled(new Set()); setPhase("terminal"); }}>
                {t("skipServices")}
              </Button>
              <Button className="flex-1" onClick={confirmUnbilledServices}>
                {t("continueToSale")} {selectedUnbilled.size > 0 && `(${selectedUnbilled.size})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ PHASE: Terminal ═══ */}
      {phase === "terminal" && (<div className="grid gap-4 lg:grid-cols-5">
        {/* ── Item Browser ── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchItems")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={tab === "products" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("products")}
              className="gap-1.5"
            >
              <Package className="h-3.5 w-3.5" /> {t("products")}
            </Button>
            <Button
              variant={tab === "services" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("services")}
              className="gap-1.5"
            >
              <ClipboardList className="h-3.5 w-3.5" /> {t("services")}
            </Button>
            {data.giftCardProducts.length > 0 && (
              <Button
                variant={tab === "giftCards" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("giftCards")}
                className="gap-1.5"
              >
                <Gift className="h-3.5 w-3.5" /> {t("giftCardProducts")}
              </Button>
            )}
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {tab === "products"
              ? filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold">
                        {formatCurrency(Number(p.price))}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {p.stock}
                      </Badge>
                    </div>
                  </button>
                ))
              : tab === "services"
                ? filteredServices.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addService(s)}
                      className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <span className="text-sm font-semibold">
                        {formatCurrency(Number(s.price))}
                      </span>
                    </button>
                  ))
                : data.giftCardProducts.map((gcp) => (
                    <button
                      key={gcp.id}
                      onClick={() => addGiftCardProduct(gcp)}
                      className="text-left p-3 rounded-lg border border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Gift className="h-3.5 w-3.5 text-purple-500" />
                        <p className="text-sm font-medium truncate">{gcp.name}</p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(Number(gcp.amount))}
                      </span>
                    </button>
                  ))}
          </div>
        </div>

        {/* ── Cart & Checkout ── */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <h3 className="font-semibold text-sm">{t("cart")}</h3>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("emptyCart")}
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cart.map((item) => {
                  const lc = lineCalcs.find((l) => l.key === item.key);
                  const lineTotal = lc?.grossTotal ?? item.unitPrice * item.quantity;
                  const lineDisc = lc?.discount ?? 0;
                  const lineItbms = lc?.itbms ?? 0;
                  const lineAfterDisc = lc?.afterDiscount ?? lineTotal;
                  return (
                    <div
                      key={item.key}
                      className="p-2 rounded-lg bg-muted/30 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.isGiftCard && <Gift className="inline h-3 w-3 text-purple-500 mr-1" />}
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unitPrice)} x {item.quantity}
                          </p>
                          {/* Per-line discount & ITBMS info */}
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
                            {lineDisc > 0 && (
                              <span className="text-[10px] text-green-600">
                                -{formatCurrency(lineDisc)} {t("discount")}
                              </span>
                            )}
                            {lineItbms > 0 ? (
                              <span className="text-[10px] text-muted-foreground">
                                {t("itbms")}: {formatCurrency(lineItbms)}
                              </span>
                            ) : item.isTaxExempt ? (
                              <span className="text-[10px] text-orange-500">
                                {t("exempt")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.key, -1)}
                            className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.key, 1)}
                            className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.key)}
                            className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold w-16 text-right">
                          {lineDisc > 0 ? (
                            <>
                              <span className="line-through text-muted-foreground text-xs">
                                {formatCurrency(lineTotal)}
                              </span>
                              <br />
                              {formatCurrency(lineAfterDisc)}
                            </>
                          ) : (
                            formatCurrency(lineTotal)
                          )}
                        </span>
                      </div>
                      {/* Per-line discount controls */}
                      {canDiscount && (
                        <div className="flex items-center gap-1">
                          {item.discountAmount && item.discountAmount > 0 ? (
                            <button
                              onClick={() => clearLineDiscount(item.key)}
                              className="text-xs text-destructive flex items-center gap-0.5 hover:underline"
                            >
                              <X className="h-3 w-3" />
                              -{item.discountType === "PERCENTAGE"
                                ? `${item.discountAmount}%`
                                : formatCurrency(item.discountAmount)}
                            </button>
                          ) : (
                            <Popover
                              open={lineDiscountKey === item.key}
                              onOpenChange={(open) => {
                                setLineDiscountKey(open ? item.key : null);
                                if (!open) setLineDiscValue("");
                              }}
                            >
                              <PopoverTrigger
                                render={
                                  <button className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground" />
                                }
                              >
                                <Percent className="h-3 w-3" />
                                {t("lineDiscount")}
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-3 space-y-2">
                                <div className="flex gap-1">
                                  <Button
                                    variant={
                                      lineDiscType === "PERCENTAGE"
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => setLineDiscType("PERCENTAGE")}
                                  >
                                    %
                                  </Button>
                                  <Button
                                    variant={
                                      lineDiscType === "FIXED"
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => setLineDiscType("FIXED")}
                                  >
                                    $
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder={t("discountValue")}
                                  value={lineDiscValue}
                                  onChange={(e) =>
                                    setLineDiscValue(e.target.value)
                                  }
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  onClick={() => applyLineDiscount(item.key)}
                                >
                                  {t("applyCode")}
                                </Button>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Auto-applied Promotions ── */}
            {cart.length > 0 && appliedPromos.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-medium">{t("promoApplied")}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {appliedPromos.map((p) => (
                    <Badge key={p.id} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs gap-1">
                      {p.name} -{formatCurrency(p.discountAmount)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* ── Transaction Discount ── */}
            {cart.length > 0 && canDiscount && (
              <div className="border-t pt-3">
                {showTxDiscount ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">
                        {t("transactionDiscount")}
                      </span>
                      <button
                        onClick={() => {
                          setShowTxDiscount(false);
                          setTxDiscountValue("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant={
                          txDiscountType === "PERCENTAGE"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setTxDiscountType("PERCENTAGE")}
                      >
                        <Percent className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={
                          txDiscountType === "FIXED" ? "default" : "outline"
                        }
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setTxDiscountType("FIXED")}
                      >
                        <DollarSign className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-7 text-sm flex-1"
                        placeholder={t("discountValue")}
                        value={txDiscountValue}
                        onChange={(e) => setTxDiscountValue(e.target.value)}
                      />
                    </div>
                    {txDiscount > 0 && (
                      <p className="text-xs text-green-600">
                        -{formatCurrency(txDiscount)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                    onClick={() => setShowTxDiscount(true)}
                  >
                    <Percent className="h-3.5 w-3.5" />
                    {t("applyDiscount")}
                  </Button>
                )}
              </div>
            )}

            {/* ── Totals ── */}
            {cart.length > 0 && (
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{tc("subtotal")}</span>
                  <span>{formatCurrency(ticketSubtotalNoTax)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t("discount")}</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("itbms")} (7%)</span>
                  <span>{formatCurrency(ticketItbms)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>{tc("total")}</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            )}

            {/* ── Client ── */}
            {cart.length > 0 && (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("customerSelected")}:</span>
                    {ownerId ? (() => {
                      const owner = data.owners.find((o) => o.id === ownerId);
                      return owner ? (
                        <span className="text-sm font-medium">{owner.firstName} {owner.lastName}</span>
                      ) : null;
                    })() : (
                      <span className="text-sm text-muted-foreground">{t("walkIn")}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={resetToCustomerPhase}>
                    {t("changeCustomer")}
                  </Button>
                </div>

                {/* ── Loyalty ── */}
                {loyaltyConfig.isEnabled && ownerId && (
                  <div className="rounded-lg border p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-xs font-medium">{t("loyalty")}</span>
                    </div>
                    {loyaltyLoading ? (
                      <p className="text-xs text-muted-foreground">
                        {tc("loading")}
                      </p>
                    ) : loyaltyBalance !== null && loyaltyBalance > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {t("loyaltyBalance")}:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(loyaltyBalance)}
                          </span>
                        </p>
                        <div className="flex gap-1.5">
                          <Input
                            type="number"
                            min={loyaltyConfig.minRedemption}
                            max={Math.min(loyaltyBalance, finalTotal)}
                            step="0.01"
                            className="h-7 text-xs flex-1"
                            placeholder={t("loyaltyAmount")}
                            value={loyaltyRedeem}
                            onChange={(e) => setLoyaltyRedeem(e.target.value)}
                          />
                          {loyaltyRedeemAmount > 0 && (
                            <button
                              onClick={() => setLoyaltyRedeem("")}
                              className="text-xs text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {loyaltyRedeemAmount > 0 && (
                          <p className="text-xs text-green-600">
                            {t("loyaltyRedeemed")}: -{formatCurrency(loyaltyRedeemAmount)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("loyaltyBalance")}: {formatCurrency(0)}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Gift Card ── */}
                <div className="rounded-lg border p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs font-medium">{t("giftCard")}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1.5"
                      onClick={() => setShowTopUpGC(true)}
                    >
                      {t("topUpGiftCard")}
                    </Button>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      className="h-7 text-xs flex-1 font-mono"
                      placeholder={t("enterGiftCard")}
                      value={giftCardCode}
                      onChange={(e) => {
                        setGiftCardCode(e.target.value.toUpperCase());
                        setGiftCardError("");
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleApplyGiftCard()
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={handleApplyGiftCard}
                      disabled={!giftCardCode.trim()}
                    >
                      {t("applyCode")}
                    </Button>
                  </div>
                  {giftCardError && (
                    <p className="text-xs text-destructive">{giftCardError}</p>
                  )}
                  {giftCardItemsTotal > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("giftCardPaymentLimit", { amount: formatCurrency(maxGiftCardPayment) })}
                    </p>
                  )}
                </div>

                {/* ── Payment Methods ── */}
                <div className="space-y-2">
                  <span className="text-xs font-medium">{t("paymentMethods")}</span>

                  {/* Quick pay buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ["CASH", t("cash")],
                        ["CARD", t("card")],
                        ["YAPPY", t("yappy")],
                        ["BANK_TRANSFER", t("bankTransfer")],
                      ] as const
                    ).map(([method, label]) => {
                      const hasPayment = payments.some((p) => p.method === method);
                      const fullyPaid = payments.length > 0 && remainingToPay <= 0.01;
                      return (
                        <Button
                          key={method}
                          variant={hasPayment ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleQuickPay(method as PaymentMethod)}
                          disabled={fullyPaid && !hasPayment}
                        >
                          {method === "CARD" ? (
                            <CreditCard className="h-3 w-3" />
                          ) : null}
                          {label}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Split payment section */}
                  {payments.length > 0 && (
                    <div className="space-y-1">
                      {payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1"
                        >
                          <span>
                            {methodLabel(p.method)}
                            {p.giftCardCode && (
                              <span className="font-mono ml-1 text-muted-foreground">
                                ({p.giftCardCode})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">
                              {formatCurrency(p.amount)}
                            </span>
                            <button
                              onClick={() => removePayment(p.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {loyaltyRedeemAmount > 0 && (
                        <div className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                          <span>{t("loyalty")}</span>
                          <span className="font-medium">
                            {formatCurrency(loyaltyRedeemAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remaining balance */}
                  {payments.length > 0 && (
                    <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50">
                      <span className="font-medium">{t("remainingBalance")}</span>
                      <span className={`font-bold ${remainingToPay > 0.01 ? "text-destructive" : "text-green-600"}`}>
                        {formatCurrency(remainingToPay)}
                      </span>
                    </div>
                  )}

                </div>

                {/* ── Charge Button ── */}
                <Button
                  onClick={handleCharge}
                  disabled={
                    cart.length === 0 ||
                    loading ||
                    payments.length === 0 ||
                    remainingToPay > 0.01
                  }
                  className="w-full"
                  size="lg"
                >
                  {loading
                    ? t("processing")
                    : `${t("charge")} ${formatCurrency(finalTotal)}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>)}

      {/* ── Cash Denomination Calculator ── */}
      <Dialog open={showCashCalc} onOpenChange={(open) => { if (!open) { setShowCashCalc(false); clearDenominations(); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("cash")}</DialogTitle>
            <DialogDescription>
              {t("remainingBalance")}: {formatCurrency(remainingToPay > 0 ? remainingToPay : finalTotal - loyaltyRedeemAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-4 gap-2">
              {cashDenominationValues.map((d) => (
                <Button
                  key={d}
                  variant="outline"
                  size="sm"
                  className="h-10 text-sm font-medium"
                  onClick={() => addDenomination(d)}
                >
                  {d >= 1 ? `$${d}` : `${Math.round(d * 100)}¢`}
                </Button>
              ))}
              <Button
                variant="destructive"
                size="sm"
                className="h-10 text-xs"
                onClick={clearDenominations}
              >
                C
              </Button>
            </div>

            {/* Denomination breakdown */}
            {Object.entries(cashDenominations).filter(([, c]) => c > 0).length > 0 && (
              <div className="border rounded-md p-2 space-y-0.5">
                {Object.entries(cashDenominations)
                  .filter(([, c]) => c > 0)
                  .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                  .map(([d, count]) => (
                    <div key={d} className="flex justify-between text-xs">
                      <span>{parseFloat(d) >= 1 ? `$${parseFloat(d).toFixed(0)}` : `${Math.round(parseFloat(d) * 100)}¢`} x {count}</span>
                      <span className="font-medium">{formatCurrency(parseFloat(d) * count)}</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{tc("total")}</span>
                <span className="font-bold text-base">{formatCurrency(cashTotal)}</span>
              </div>
              {cashChange > 0.005 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>{t("balance")}</span>
                  <span className="font-bold">{formatCurrency(cashChange)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCashCalc(false); clearDenominations(); }}>
              {tc("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={cashTotal <= 0}
              onClick={confirmCashPayment}
            >
              {t("charge")} {formatCurrency(cashTotal)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Due Modal ── */}
      <Dialog open={showChangeModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs">
          <div className="text-center space-y-4 py-4">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-5 w-20 h-20 mx-auto flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("balance")}</p>
              <p className="text-4xl font-bold text-orange-600">{formatCurrency(changeAmount)}</p>
            </div>
            {completedSaleNumber && (
              <p className="text-xs text-muted-foreground">
                {t("saleNumber")}{completedSaleNumber}
              </p>
            )}
            <Button onClick={closeChangeModal} className="w-full" size="lg">
              {tc("close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Generated Gift Card Codes Dialog ── */}
      <Dialog open={showGCCodes} onOpenChange={(open) => { if (!open) { setShowGCCodes(false); setGeneratedCodes([]); router.refresh(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("gcActivated")}</DialogTitle>
            <DialogDescription>{t("giftCardGenerated")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {generatedCodes.map((gc, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-500" />
                  <span className="font-mono font-bold text-sm">{gc.code}</span>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(gc.amount)}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowGCCodes(false); setGeneratedCodes([]); router.refresh(); }} className="w-full">
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Top-Up Gift Card Dialog ── */}
      <Dialog open={showTopUpGC} onOpenChange={(open) => !open && closeTopUpGCDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("topUpGiftCard")}</DialogTitle>
            <DialogDescription>{t("topUpAmount")}</DialogDescription>
          </DialogHeader>
          {topUpGCResult ? (
            <div className="space-y-3 py-2 text-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <Gift className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-mono text-lg font-bold">{topUpGCResult.code}</p>
              <p className="text-sm">
                {t("giftCardBalance")}: {formatCurrency(topUpGCResult.newBalance)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("saleNumber")}{topUpGCResult.saleNumber}
              </p>
              <DialogFooter>
                <Button onClick={closeTopUpGCDialog} className="w-full">{tc("close")}</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>{t("giftCardCode")} *</Label>
                <Input
                  className="font-mono"
                  placeholder="GC-XXXX-XXXX"
                  autoFocus
                  value={topUpGCCode}
                  onChange={(e) => {
                    setTopUpGCCode(e.target.value.toUpperCase());
                    setTopUpGCError("");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("topUpAmount")} (B/.) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={topUpGCAmount}
                  onChange={(e) => setTopUpGCAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("paymentMethod")}</Label>
                <Select value={topUpGCMethod} onValueChange={(v) => setTopUpGCMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t("cash")}</SelectItem>
                    <SelectItem value="CARD">{t("card")}</SelectItem>
                    <SelectItem value="YAPPY">{t("yappy")}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t("bankTransfer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {topUpGCError && (
                <p className="text-xs text-destructive">{topUpGCError}</p>
              )}
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={closeTopUpGCDialog}>{tc("cancel")}</Button>
                <Button
                  size="sm"
                  disabled={topUpGCLoading || !topUpGCCode.trim() || !topUpGCAmount || parseFloat(topUpGCAmount) <= 0}
                  onClick={handleTopUpGiftCard}
                >
                  {topUpGCLoading ? tc("loading") : t("topUpGiftCard")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Gift Card Code Input Dialog (when selling a gift card) ── */}
      <Dialog open={showGCInput} onOpenChange={(open) => { if (!open) { setShowGCInput(false); setGcInputProduct(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("gcEnterCode")}</DialogTitle>
            <DialogDescription>
              {gcInputProduct && `${gcInputProduct.name} — ${formatCurrency(Number(gcInputProduct.amount))}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t("gcCardNumber")} *</Label>
              <Input
                className="font-mono text-center text-lg tracking-wider"
                placeholder="GC-XXXX-XXXX"
                autoFocus
                value={gcInputCode}
                onChange={(e) => {
                  setGcInputCode(e.target.value.toUpperCase());
                  setGcInputError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") confirmGiftCardCode(); }}
              />
            </div>
            {gcInputError && (
              <p className="text-xs text-destructive">{gcInputError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowGCInput(false); setGcInputProduct(null); }}>
              {tc("cancel")}
            </Button>
            <Button size="sm" onClick={confirmGiftCardCode} disabled={!gcInputCode.trim()}>
              {t("gcConfirmAdd")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
