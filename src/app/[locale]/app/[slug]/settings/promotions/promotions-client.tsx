"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Search,
  Tag,
  ChevronLeft,
  ChevronRight,
  Power,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { formatCurrency } from "@/lib/utils";
import {
  getPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  togglePromotion,
} from "../actions";
import { getPosData } from "../../pos/actions";
import type { PromotionType, DiscountUnit } from "@/generated/prisma/client";

type PromotionsData = Awaited<ReturnType<typeof getPromotions>>;
type PromotionRow = PromotionsData["items"][number];
type PosData = Awaited<ReturnType<typeof getPosData>>;

const PROMO_TYPES: PromotionType[] = [
  "DISCOUNT_PERCENTAGE",
  "DISCOUNT_FIXED",
  "BUY_X_GET_Y",
  "BUNDLE_PRICE",
  "FREE_DELIVERY",
  "VOLUME_DISCOUNT",
];

type VolumeTier = {
  tierOrder: number;
  minQty: string;
  maxQty: string;
  discount: string;
  discountUnit: DiscountUnit;
};

const DEFAULT_TIERS: VolumeTier[] = [
  { tierOrder: 1, minQty: "2", maxQty: "5", discount: "", discountUnit: "PERCENTAGE" },
  { tierOrder: 2, minQty: "6", maxQty: "10", discount: "", discountUnit: "PERCENTAGE" },
  { tierOrder: 3, minQty: "11", maxQty: "", discount: "", discountUnit: "PERCENTAGE" },
];

function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

// Types that need item selection
const NEEDS_ITEMS: PromotionType[] = ["DISCOUNT_PERCENTAGE", "DISCOUNT_FIXED", "BUNDLE_PRICE", "FREE_DELIVERY", "VOLUME_DISCOUNT"];
// Types that only allow services
const SERVICES_ONLY: PromotionType[] = ["FREE_DELIVERY"];

interface ItemSelectorProps {
  products: PosData["products"];
  services: PosData["services"];
  selectedProductIds: string[];
  selectedServiceIds: string[];
  onProductsChange: (ids: string[]) => void;
  onServicesChange: (ids: string[]) => void;
  servicesOnly?: boolean;
  t: (key: string) => string;
}

function ItemSelector({
  products,
  services,
  selectedProductIds,
  selectedServiceIds,
  onProductsChange,
  onServicesChange,
  servicesOnly = false,
  t,
}: ItemSelectorProps) {
  const [itemSearch, setItemSearch] = useState("");

  const filteredProducts = useMemo(() => {
    if (servicesOnly) return [];
    if (!itemSearch) return products;
    const q = itemSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, itemSearch, servicesOnly]);

  const filteredServices = useMemo(() => {
    if (!itemSearch) return services;
    const q = itemSearch.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, itemSearch]);

  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const hasSelected = selectedProducts.length > 0 || selectedServices.length > 0;

  return (
    <div className="rounded-md border p-3 space-y-3">
      {/* Selected items as bubbles */}
      {hasSelected && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("promoSelectedItems")}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {selectedProducts.map((p) => (
              <Badge
                key={p.id}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => onProductsChange(selectedProductIds.filter((id) => id !== p.id))}
              >
                {p.name} ({formatCurrency(Number(p.price))})
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {selectedServices.map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => onServicesChange(selectedServiceIds.filter((id) => id !== s.id))}
              >
                {s.name} ({formatCurrency(Number(s.price))})
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("promoItemSearch")}
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          className="pl-7 h-8 text-sm"
        />
      </div>

      {/* Available items */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {!servicesOnly && filteredProducts.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {t("promoProducts")}
            </p>
            {filteredProducts
              .filter((p) => !selectedProductIds.includes(p.id))
              .map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  className="flex items-center w-full gap-2 p-1.5 rounded hover:bg-muted/50 text-sm text-left"
                  onClick={() => onProductsChange([...selectedProductIds, prod.id])}
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{prod.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatCurrency(Number(prod.price))}
                  </span>
                </button>
              ))}
          </div>
        )}
        {filteredServices.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {t("promoServices")}
            </p>
            {filteredServices
              .filter((s) => !selectedServiceIds.includes(s.id))
              .map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  className="flex items-center w-full gap-2 p-1.5 rounded hover:bg-muted/50 text-sm text-left"
                  onClick={() => onServicesChange([...selectedServiceIds, svc.id])}
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{svc.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatCurrency(Number(svc.price))}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      {!hasSelected && (
        <p className="text-xs text-muted-foreground text-center py-2">{t("promoNoItems")}</p>
      )}
    </div>
  );
}

// Single item picker for Buy X Get Y
interface SingleItemPickerProps {
  products: PosData["products"];
  services: PosData["services"];
  selectedProductId: string | null;
  selectedServiceId: string | null;
  onSelect: (productId: string | null, serviceId: string | null) => void;
  label: string;
  t: (key: string) => string;
}

function SingleItemPicker({
  products,
  services,
  selectedProductId,
  selectedServiceId,
  onSelect,
  label,
  t,
}: SingleItemPickerProps) {
  const [itemSearch, setItemSearch] = useState("");

  const selectedItem = selectedProductId
    ? products.find((p) => p.id === selectedProductId)
    : selectedServiceId
      ? services.find((s) => s.id === selectedServiceId)
      : null;
  const selectedType = selectedProductId ? "product" : selectedServiceId ? "service" : null;

  const filteredProducts = useMemo(() => {
    if (!itemSearch) return products;
    const q = itemSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, itemSearch]);

  const filteredServices = useMemo(() => {
    if (!itemSearch) return services;
    const q = itemSearch.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, itemSearch]);

  return (
    <div className="rounded-md border p-3 space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>

      {selectedItem && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => onSelect(null, null)}>
            {selectedItem.name} ({formatCurrency(Number(selectedItem.price))})
            <span className="text-[10px] ml-1 opacity-60">{selectedType === "product" ? "P" : "S"}</span>
            <X className="h-3 w-3" />
          </Badge>
        </div>
      )}

      {!selectedItem && (
        <>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("promoItemSearch")}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <div className="max-h-36 overflow-y-auto space-y-2">
            {filteredProducts.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                  {t("promoProducts")}
                </p>
                {filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    className="flex items-center w-full gap-2 p-1.5 rounded hover:bg-muted/50 text-sm text-left"
                    onClick={() => onSelect(prod.id, null)}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{prod.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatCurrency(Number(prod.price))}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {filteredServices.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                  {t("promoServices")}
                </p>
                {filteredServices.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    className="flex items-center w-full gap-2 p-1.5 rounded hover:bg-muted/50 text-sm text-left"
                    onClick={() => onSelect(null, svc.id)}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{svc.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatCurrency(Number(svc.price))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface PromotionsClientProps {
  initialData: PromotionsData;
}

export function PromotionsClient({ initialData }: PromotionsClientProps) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Common form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<PromotionType>("DISCOUNT_PERCENTAGE");
  const [formValue, setFormValue] = useState("");
  const [formMinPurchase, setFormMinPurchase] = useState("");
  const [formMaxDiscount, setFormMaxDiscount] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState("");
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState("");
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formAvailableOnline, setFormAvailableOnline] = useState(false);
  const [formProductIds, setFormProductIds] = useState<string[]>([]);
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);

  // Buy X Get Y state
  const [formTriggerProductId, setFormTriggerProductId] = useState<string | null>(null);
  const [formTriggerServiceId, setFormTriggerServiceId] = useState<string | null>(null);
  const [formRewardProductId, setFormRewardProductId] = useState<string | null>(null);
  const [formRewardServiceId, setFormRewardServiceId] = useState<string | null>(null);
  const [formRewardDiscount, setFormRewardDiscount] = useState("");
  const [formRewardDiscountUnit, setFormRewardDiscountUnit] = useState<DiscountUnit>("PERCENTAGE");

  // Bundle state
  const [formBundlePrice, setFormBundlePrice] = useState("");

  // Volume tiers state
  const [formVolumeTiers, setFormVolumeTiers] = useState<VolumeTier[]>(DEFAULT_TIERS);

  // POS data for item selectors
  const [posData, setPosData] = useState<PosData | null>(null);
  const [posLoading, setPosLoading] = useState(false);

  const needsItems = NEEDS_ITEMS.includes(formType);
  const isBuyXGetY = formType === "BUY_X_GET_Y";

  const loadData = useCallback(
    async (s?: string, p?: number) => {
      setLoading(true);
      try {
        const result = await getPromotions(s || undefined, p ?? 1);
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadData]);

  function resetForm() {
    setFormName("");
    setFormType("DISCOUNT_PERCENTAGE");
    setFormValue("");
    setFormMinPurchase("");
    setFormMaxDiscount("");
    setFormUsageLimit("");
    setFormPerCustomerLimit("");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormAvailableOnline(false);
    setFormProductIds([]);
    setFormServiceIds([]);
    setFormTriggerProductId(null);
    setFormTriggerServiceId(null);
    setFormRewardProductId(null);
    setFormRewardServiceId(null);
    setFormRewardDiscount("");
    setFormRewardDiscountUnit("PERCENTAGE");
    setFormBundlePrice("");
    setFormVolumeTiers(DEFAULT_TIERS.map((t) => ({ ...t })));
    setEditId(null);
  }

  function openCreate() {
    resetForm();
    const today = new Date().toISOString().split("T")[0];
    setFormStartsAt(today);
    setShowDialog(true);
  }

  async function openEdit(promo: PromotionRow) {
    setEditId(promo.id);
    setSaving(true);
    setShowDialog(true);
    try {
      const full = await getPromotion(promo.id);
      if (!full) return;
      setFormName(full.name);
      setFormType(full.type);
      setFormValue(String(Number(full.value)));
      setFormMinPurchase(full.minPurchase ? String(Number(full.minPurchase)) : "");
      setFormMaxDiscount(full.maxDiscount ? String(Number(full.maxDiscount)) : "");
      setFormUsageLimit(full.usageLimit != null ? String(full.usageLimit) : "");
      setFormPerCustomerLimit(full.perCustomerLimit != null ? String(full.perCustomerLimit) : "");
      setFormStartsAt(toDateInputValue(full.startsAt));
      setFormEndsAt(toDateInputValue(full.endsAt));
      setFormAvailableOnline(full.availableOnline);
      setFormProductIds(full.includedProducts.map((p) => p.productId));
      setFormServiceIds(full.includedServices.map((s) => s.serviceId));
      // Buy X Get Y
      setFormTriggerProductId(full.triggerProductId ?? null);
      setFormTriggerServiceId(full.triggerServiceId ?? null);
      setFormRewardProductId(full.rewardProductId ?? null);
      setFormRewardServiceId(full.rewardServiceId ?? null);
      setFormRewardDiscount(full.rewardDiscount ? String(Number(full.rewardDiscount)) : "");
      setFormRewardDiscountUnit(full.rewardDiscountUnit ?? "PERCENTAGE");
      // Bundle
      setFormBundlePrice(full.bundlePrice ? String(Number(full.bundlePrice)) : "");
      // Volume tiers
      if (full.volumeTiers && full.volumeTiers.length > 0) {
        setFormVolumeTiers(
          full.volumeTiers.map((t) => ({
            tierOrder: t.tierOrder,
            minQty: String(t.minQty),
            maxQty: t.maxQty != null ? String(t.maxQty) : "",
            discount: String(Number(t.discount)),
            discountUnit: t.discountUnit,
          })),
        );
      } else {
        setFormVolumeTiers(DEFAULT_TIERS.map((t) => ({ ...t })));
      }
    } finally {
      setSaving(false);
    }
  }

  // Load POS data when dialog opens and items are needed
  useEffect(() => {
    if (showDialog && !posData && !posLoading) {
      setPosLoading(true);
      getPosData()
        .then(setPosData)
        .finally(() => setPosLoading(false));
    }
  }, [showDialog, posData, posLoading]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const base = {
        name: formName,
        type: formType,
        value: parseFloat(formValue) || 0,
        minPurchase: formMinPurchase ? parseFloat(formMinPurchase) : undefined,
        maxDiscount: formMaxDiscount ? parseFloat(formMaxDiscount) : undefined,
        usageLimit: formUsageLimit ? parseInt(formUsageLimit, 10) : undefined,
        perCustomerLimit: formPerCustomerLimit ? parseInt(formPerCustomerLimit, 10) : undefined,
        startsAt: formStartsAt,
        endsAt: formEndsAt,
        isActive: true,
        appliesToAll: !needsItems && !isBuyXGetY,
        availableOnline: formAvailableOnline,
        productIds: needsItems ? formProductIds : undefined,
        serviceIds: needsItems ? formServiceIds : undefined,
        // Buy X Get Y
        triggerProductId: isBuyXGetY ? formTriggerProductId ?? undefined : undefined,
        triggerServiceId: isBuyXGetY ? formTriggerServiceId ?? undefined : undefined,
        rewardProductId: isBuyXGetY ? formRewardProductId ?? undefined : undefined,
        rewardServiceId: isBuyXGetY ? formRewardServiceId ?? undefined : undefined,
        rewardDiscount: isBuyXGetY && formRewardDiscount ? parseFloat(formRewardDiscount) : undefined,
        rewardDiscountUnit: isBuyXGetY ? formRewardDiscountUnit : undefined,
        // Bundle
        bundlePrice: formType === "BUNDLE_PRICE" && formBundlePrice ? parseFloat(formBundlePrice) : undefined,
        // Volume tiers
        volumeTiers:
          formType === "VOLUME_DISCOUNT"
            ? formVolumeTiers.map((t) => ({
                tierOrder: t.tierOrder,
                minQty: parseInt(t.minQty, 10) || 0,
                maxQty: t.maxQty ? parseInt(t.maxQty, 10) : undefined,
                discount: parseFloat(t.discount) || 0,
                discountUnit: t.discountUnit,
              }))
            : undefined,
      };

      if (editId) {
        await updatePromotion(editId, base);
      } else {
        await createPromotion(base);
      }

      setShowDialog(false);
      resetForm();
      await loadData(search, page);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(promo: PromotionRow) {
    await togglePromotion(promo.id);
    await loadData(search, page);
    router.refresh();
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await loadData(search, newPage);
  }

  function getStatus(promo: PromotionRow) {
    const now = new Date();
    const start = new Date(promo.startsAt);
    const end = new Date(promo.endsAt);
    if (!promo.isActive) return "inactive";
    if (now > end) return "expired";
    if (now < start) return "scheduled";
    return "active";
  }

  function statusBadge(promo: PromotionRow) {
    const status = getStatus(promo);
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t("promoStatusActive")}</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t("promoStatusScheduled")}</Badge>;
      case "expired":
        return <Badge variant="secondary">{t("promoStatusExpired")}</Badge>;
      case "inactive":
        return <Badge variant="destructive">{t("promoStatusInactive")}</Badge>;
    }
  }

  function typeBadge(type: PromotionType) {
    return <Badge variant="outline">{t(`promoTypeLabels.${type}`)}</Badge>;
  }

  function formatValue(promo: PromotionRow) {
    if (promo.type === "DISCOUNT_PERCENTAGE") return `${Number(promo.value)}%`;
    if (promo.type === "DISCOUNT_FIXED") return formatCurrency(Number(promo.value));
    if (promo.type === "BUNDLE_PRICE") return promo.bundlePrice ? formatCurrency(Number(promo.bundlePrice)) : "-";
    if (promo.type === "VOLUME_DISCOUNT") return t("promoVolumeTiers");
    if (promo.type === "FREE_DELIVERY") return t("promoTypeLabels.FREE_DELIVERY");
    if (promo.type === "BUY_X_GET_Y") {
      const reward = promo.rewardProduct?.name ?? promo.rewardService?.name ?? "?";
      const disc = promo.rewardDiscount ? Number(promo.rewardDiscount) : 0;
      const unit = promo.rewardDiscountUnit === "PERCENTAGE" ? `${disc}%` : formatCurrency(disc);
      return `${reward} → ${unit}`;
    }
    return String(Number(promo.value));
  }

  function formatDateRange(promo: PromotionRow) {
    const fmt = (d: Date | string) => new Date(d).toLocaleDateString();
    return `${fmt(promo.startsAt)} - ${fmt(promo.endsAt)}`;
  }

  function usageDisplay(promo: PromotionRow) {
    const count = promo.usageCount;
    const limit = promo.usageLimit;
    if (limit != null && limit > 0) return `${count} / ${limit}`;
    return `${count}`;
  }

  // Value label depends on type
  const valueLabel =
    formType === "DISCOUNT_PERCENTAGE"
      ? t("promoValuePercent")
      : formType === "DISCOUNT_FIXED"
        ? t("promoValueDollar")
        : t("promoValue");

  // Whether to show the value field
  const showValueField = formType === "DISCOUNT_PERCENTAGE" || formType === "DISCOUNT_FIXED";

  function updateTier(index: number, field: keyof VolumeTier, val: string) {
    setFormVolumeTiers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("promotionsTitle")} backHref={`/app/${organization.slug}/settings`}>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("newPromotion")}
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPromotions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {data.items.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Tag className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("noPromotions")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {data.items.map((promo) => (
              <Card key={promo.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{promo.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {typeBadge(promo.type)}
                        {statusBadge(promo)}
                        {promo.availableOnline && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {t("promoOnlineBadge")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatValue(promo)} &middot; {formatDateRange(promo)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(promo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(promo)}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("promoName")}</TableHead>
                  <TableHead>{t("promoType")}</TableHead>
                  <TableHead>{t("promoValue")}</TableHead>
                  <TableHead>{t("promoDateRange")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("promoUses")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.name}</TableCell>
                    <TableCell>{typeBadge(promo.type)}</TableCell>
                    <TableCell>{formatValue(promo)}</TableCell>
                    <TableCell className="text-xs">{formatDateRange(promo)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {statusBadge(promo)}
                        {promo.availableOnline && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {t("promoOnlineBadge")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{usageDisplay(promo)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openEdit(promo)}
                        >
                          <Pencil className="h-4 w-4" /> {tc("edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={promo.isActive ? "text-destructive gap-1.5" : "text-green-600 gap-1.5"}
                          onClick={() => handleToggle(promo)}
                        >
                          <Power className="h-4 w-4" />
                          {promo.isActive ? t("promoDeactivate") : t("promoActivate")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => handlePageChange(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? t("editPromotion") : t("newPromotion")}</DialogTitle>
            <DialogDescription>{t("promotionsDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>{t("promoName")} *</Label>
                <Input required autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>{t("promoType")} *</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as PromotionType)}>
                  <SelectTrigger>
                    <SelectValue>{t(`promoTypeLabels.${formType}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROMO_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {t(`promoTypeLabels.${pt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* === Type-specific sections === */}

              {/* DISCOUNT_PERCENTAGE / DISCOUNT_FIXED: value + items */}
              {showValueField && (
                <div className="space-y-1.5">
                  <Label>{valueLabel} *</Label>
                  <Input type="number" step="0.01" min="0" required value={formValue} onChange={(e) => setFormValue(e.target.value)} />
                </div>
              )}

              {formType === "DISCOUNT_PERCENTAGE" && (
                <div className="space-y-1.5">
                  <Label>{t("promoMaxDiscount")}</Label>
                  <Input type="number" step="0.01" min="0" value={formMaxDiscount} onChange={(e) => setFormMaxDiscount(e.target.value)} />
                </div>
              )}

              {/* BUY_X_GET_Y: trigger item, reward item, reward discount */}
              {isBuyXGetY && posData && (
                <>
                  <SingleItemPicker
                    products={posData.products}
                    services={posData.services}
                    selectedProductId={formTriggerProductId}
                    selectedServiceId={formTriggerServiceId}
                    onSelect={(pid, sid) => { setFormTriggerProductId(pid); setFormTriggerServiceId(sid); }}
                    label={t("promoTriggerItem")}
                    t={t}
                  />
                  <SingleItemPicker
                    products={posData.products}
                    services={posData.services}
                    selectedProductId={formRewardProductId}
                    selectedServiceId={formRewardServiceId}
                    onSelect={(pid, sid) => { setFormRewardProductId(pid); setFormRewardServiceId(sid); }}
                    label={t("promoRewardItem")}
                    t={t}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("promoRewardDiscount")} *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formRewardDiscount}
                        onChange={(e) => setFormRewardDiscount(e.target.value)}
                        placeholder="100 = free"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("promoRewardDiscountUnit")}</Label>
                      <Select value={formRewardDiscountUnit} onValueChange={(v) => setFormRewardDiscountUnit(v as DiscountUnit)}>
                        <SelectTrigger>
                          <SelectValue>{formRewardDiscountUnit === "PERCENTAGE" ? "%" : "$"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">%</SelectItem>
                          <SelectItem value="FIXED">$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* BUNDLE_PRICE: items + total price */}
              {formType === "BUNDLE_PRICE" && (
                <div className="space-y-1.5">
                  <Label>{t("promoBundlePrice")} *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formBundlePrice}
                    onChange={(e) => setFormBundlePrice(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("promoBundlePriceDesc")}</p>
                </div>
              )}

              {/* VOLUME_DISCOUNT: 3 tier rows */}
              {formType === "VOLUME_DISCOUNT" && (
                <div className="space-y-2">
                  <Label>{t("promoVolumeTiers")}</Label>
                  {formVolumeTiers.map((tier, idx) => (
                    <div key={tier.tierOrder} className="grid grid-cols-[1fr_1fr_1fr_80px] gap-2 items-end rounded-md border p-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("promoTierMinQty")}</Label>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-sm"
                          value={tier.minQty}
                          onChange={(e) => updateTier(idx, "minQty", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("promoTierMaxQty")}</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 text-sm"
                          value={tier.maxQty}
                          onChange={(e) => updateTier(idx, "maxQty", e.target.value)}
                          placeholder={idx === 2 ? "∞" : ""}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("promoTierDiscount")}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-8 text-sm"
                          value={tier.discount}
                          onChange={(e) => updateTier(idx, "discount", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("promoTierUnit")}</Label>
                        <Select value={tier.discountUnit} onValueChange={(v) => v && updateTier(idx, "discountUnit", v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue>{tier.discountUnit === "PERCENTAGE" ? "%" : "$"}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">%</SelectItem>
                            <SelectItem value="FIXED">$</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Item selector for types that need items */}
              {needsItems && posData && !posLoading && (
                <ItemSelector
                  products={posData.products}
                  services={posData.services}
                  selectedProductIds={formProductIds}
                  selectedServiceIds={formServiceIds}
                  onProductsChange={setFormProductIds}
                  onServicesChange={setFormServiceIds}
                  servicesOnly={SERVICES_ONLY.includes(formType)}
                  t={t}
                />
              )}
              {needsItems && posLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">{tc("loading")}</p>
              )}

              {/* Min Purchase */}
              <div className="space-y-1.5">
                <Label>{t("promoMinPurchase")}</Label>
                <Input type="number" step="0.01" min="0" value={formMinPurchase} onChange={(e) => setFormMinPurchase(e.target.value)} />
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("promoUsageLimit")}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    placeholder={t("promoUsageLimitPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("promoPerCustomerLimit")}</Label>
                  <Input type="number" min="0" value={formPerCustomerLimit} onChange={(e) => setFormPerCustomerLimit(e.target.value)} />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("promoStartDate")} *</Label>
                  <Input type="date" required value={formStartsAt} onChange={(e) => setFormStartsAt(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("promoEndDate")} *</Label>
                  <Input type="date" required value={formEndsAt} onChange={(e) => setFormEndsAt(e.target.value)} />
                </div>
              </div>

              {/* Available Online */}
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="available-online"
                  checked={formAvailableOnline}
                  onCheckedChange={(checked) => setFormAvailableOnline(checked === true)}
                />
                <Label htmlFor="available-online" className="text-sm font-normal cursor-pointer">
                  {t("promoAvailableOnline")}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowDialog(false); resetForm(); }}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={saving} size="sm">
                {saving ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
