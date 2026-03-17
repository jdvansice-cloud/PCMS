"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Search,
  Tag,
  ChevronLeft,
  ChevronRight,
  Power,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { PromotionType } from "@/generated/prisma/client";

type PromotionsData = Awaited<ReturnType<typeof getPromotions>>;
type PromotionRow = PromotionsData["items"][number];
type PosData = Awaited<ReturnType<typeof getPosData>>;

const PROMO_TYPES: PromotionType[] = [
  "DISCOUNT_PERCENTAGE",
  "DISCOUNT_FIXED",
  "BUY_X_GET_Y",
  "FREE_ITEM",
  "BUNDLE_PRICE",
];

function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
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

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<PromotionType>("DISCOUNT_PERCENTAGE");
  const [formValue, setFormValue] = useState("");
  const [formMinPurchase, setFormMinPurchase] = useState("");
  const [formMaxDiscount, setFormMaxDiscount] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState("");
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState("");
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formAppliesToAll, setFormAppliesToAll] = useState(true);
  const [formProductIds, setFormProductIds] = useState<string[]>([]);
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);

  // POS data for specific items selector
  const [posData, setPosData] = useState<PosData | null>(null);
  const [posLoading, setPosLoading] = useState(false);

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
    setFormCode("");
    setFormType("DISCOUNT_PERCENTAGE");
    setFormValue("");
    setFormMinPurchase("");
    setFormMaxDiscount("");
    setFormUsageLimit("");
    setFormPerCustomerLimit("");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormAppliesToAll(true);
    setFormProductIds([]);
    setFormServiceIds([]);
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
      setFormCode(full.code ?? "");
      setFormType(full.type);
      setFormValue(String(Number(full.value)));
      setFormMinPurchase(full.minPurchase ? String(Number(full.minPurchase)) : "");
      setFormMaxDiscount(full.maxDiscount ? String(Number(full.maxDiscount)) : "");
      setFormUsageLimit(full.usageLimit != null ? String(full.usageLimit) : "");
      setFormPerCustomerLimit(full.perCustomerLimit != null ? String(full.perCustomerLimit) : "");
      setFormStartsAt(toDateInputValue(full.startsAt));
      setFormEndsAt(toDateInputValue(full.endsAt));
      setFormAppliesToAll(full.appliesToAll);
      setFormProductIds(full.includedProducts.map((p) => p.productId));
      setFormServiceIds(full.includedServices.map((s) => s.serviceId));
    } finally {
      setSaving(false);
    }
  }

  // Load POS data when "specific items" is selected
  useEffect(() => {
    if (!formAppliesToAll && !posData && !posLoading) {
      setPosLoading(true);
      getPosData()
        .then(setPosData)
        .finally(() => setPosLoading(false));
    }
  }, [formAppliesToAll, posData, posLoading]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const input = {
        name: formName,
        code: formCode || undefined,
        type: formType,
        value: parseFloat(formValue),
        minPurchase: formMinPurchase ? parseFloat(formMinPurchase) : undefined,
        maxDiscount: formMaxDiscount ? parseFloat(formMaxDiscount) : undefined,
        usageLimit: formUsageLimit ? parseInt(formUsageLimit, 10) : undefined,
        perCustomerLimit: formPerCustomerLimit ? parseInt(formPerCustomerLimit, 10) : undefined,
        startsAt: formStartsAt,
        endsAt: formEndsAt,
        isActive: true,
        appliesToAll: formAppliesToAll,
        productIds: formAppliesToAll ? undefined : formProductIds,
        serviceIds: formAppliesToAll ? undefined : formServiceIds,
      };

      if (editId) {
        await updatePromotion(editId, input);
      } else {
        await createPromotion(input);
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
    if (promo.type === "DISCOUNT_FIXED" || promo.type === "BUNDLE_PRICE") return formatCurrency(Number(promo.value));
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

  const valueLabel =
    formType === "DISCOUNT_PERCENTAGE"
      ? t("promoValuePercent")
      : formType === "DISCOUNT_FIXED" || formType === "BUNDLE_PRICE"
        ? t("promoValueDollar")
        : t("promoValueAmount");

  return (
    <div className="space-y-6">
      <PageHeader title={t("promotionsTitle")}>
        <Link href={`/app/${organization.slug}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToSettings")}
          </Button>
        </Link>
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
                      <p className="text-xs text-muted-foreground">
                        {promo.code ?? t("promoAutoApply")}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {typeBadge(promo.type)}
                        {statusBadge(promo)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatValue(promo)} &middot; {formatDateRange(promo)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(promo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(promo)}
                      >
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
                  <TableHead>{t("promoCode")}</TableHead>
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
                    <TableCell>
                      {promo.code ? (
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{promo.code}</code>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t("promoAutoApply")}</span>
                      )}
                    </TableCell>
                    <TableCell>{typeBadge(promo.type)}</TableCell>
                    <TableCell>{formatValue(promo)}</TableCell>
                    <TableCell className="text-xs">{formatDateRange(promo)}</TableCell>
                    <TableCell>{statusBadge(promo)}</TableCell>
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
                          className={
                            promo.isActive
                              ? "text-destructive gap-1.5"
                              : "text-green-600 gap-1.5"
                          }
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
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
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
            <DialogTitle>
              {editId ? t("editPromotion") : t("newPromotion")}
            </DialogTitle>
            <DialogDescription>
              {t("promotionsDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>{t("promoName")} *</Label>
                <Input
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {/* Code */}
              <div className="space-y-1.5">
                <Label>{t("promoCode")}</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder={t("promoCodePlaceholder")}
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>{t("promoType")} *</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as PromotionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              {/* Value */}
              <div className="space-y-1.5">
                <Label>{valueLabel} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                />
              </div>

              {/* Min Purchase */}
              <div className="space-y-1.5">
                <Label>{t("promoMinPurchase")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMinPurchase}
                  onChange={(e) => setFormMinPurchase(e.target.value)}
                />
              </div>

              {/* Max Discount (only for percentage) */}
              {formType === "DISCOUNT_PERCENTAGE" && (
                <div className="space-y-1.5">
                  <Label>{t("promoMaxDiscount")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                  />
                </div>
              )}

              {/* Usage Limit */}
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

              {/* Per Customer Limit */}
              <div className="space-y-1.5">
                <Label>{t("promoPerCustomerLimit")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formPerCustomerLimit}
                  onChange={(e) => setFormPerCustomerLimit(e.target.value)}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("promoStartDate")} *</Label>
                  <Input
                    type="date"
                    required
                    value={formStartsAt}
                    onChange={(e) => setFormStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("promoEndDate")} *</Label>
                  <Input
                    type="date"
                    required
                    value={formEndsAt}
                    onChange={(e) => setFormEndsAt(e.target.value)}
                  />
                </div>
              </div>

              {/* Applies To */}
              <div className="space-y-2">
                <Label>{t("promoAppliesTo")}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="appliesToAll"
                      checked={formAppliesToAll}
                      onChange={() => setFormAppliesToAll(true)}
                      className="accent-primary"
                    />
                    {t("promoAllItems")}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="appliesToAll"
                      checked={!formAppliesToAll}
                      onChange={() => setFormAppliesToAll(false)}
                      className="accent-primary"
                    />
                    {t("promoSpecificItems")}
                  </label>
                </div>
              </div>

              {/* Specific items selector */}
              {!formAppliesToAll && (
                <div className="space-y-3 rounded-md border p-3">
                  {posLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {tc("loading")}
                    </p>
                  ) : posData ? (
                    <>
                      {/* Products */}
                      {posData.products.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("promoProducts")}
                          </Label>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {posData.products.map((prod) => (
                              <label
                                key={prod.id}
                                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={formProductIds.includes(prod.id)}
                                  onCheckedChange={(checked) => {
                                    setFormProductIds((prev) =>
                                      checked
                                        ? [...prev, prod.id]
                                        : prev.filter((id) => id !== prod.id),
                                    );
                                  }}
                                />
                                <span className="truncate">{prod.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {formatCurrency(Number(prod.price))}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Services */}
                      {posData.services.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("promoServices")}
                          </Label>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {posData.services.map((svc) => (
                              <label
                                key={svc.id}
                                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-sm cursor-pointer"
                              >
                                <Checkbox
                                  checked={formServiceIds.includes(svc.id)}
                                  onCheckedChange={(checked) => {
                                    setFormServiceIds((prev) =>
                                      checked
                                        ? [...prev, svc.id]
                                        : prev.filter((id) => id !== svc.id),
                                    );
                                  }}
                                />
                                <span className="truncate">{svc.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {formatCurrency(Number(svc.price))}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
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
