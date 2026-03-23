"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/lib/use-format-date";
import {
  Plus,
  Pencil,
  Search,
  Award,
  ChevronLeft,
  ChevronRight,
  Power,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { formatCurrency } from "@/lib/utils";
import {
  getLoyaltyPromotions,
  getLoyaltyPromotion,
  createLoyaltyPromotion,
  updateLoyaltyPromotion,
  toggleLoyaltyPromotion,
} from "../actions";
import { getPosData } from "../../pos/actions";

type LoyaltyPromosData = Awaited<ReturnType<typeof getLoyaltyPromotions>>;
type LoyaltyPromoRow = LoyaltyPromosData["items"][number];
type PosData = Awaited<ReturnType<typeof getPosData>>;

function toDateInputValue(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

// Reusable item selector for qualifying/reward items
interface ItemPickerProps {
  products: PosData["products"];
  services: PosData["services"];
  selectedProductIds: string[];
  selectedServiceIds: string[];
  onProductsChange: (ids: string[]) => void;
  onServicesChange: (ids: string[]) => void;
  label: string;
  t: (key: string) => string;
}

function ItemPicker({
  products,
  services,
  selectedProductIds,
  selectedServiceIds,
  onProductsChange,
  onServicesChange,
  label,
  t,
}: ItemPickerProps) {
  const [itemSearch, setItemSearch] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.includes(p.id)),
    [products, selectedProductIds],
  );
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds],
  );

  const filteredProducts = useMemo(
    () =>
      itemSearch
        ? products.filter(
            (p) =>
              !selectedProductIds.includes(p.id) &&
              p.name.toLowerCase().includes(itemSearch.toLowerCase()),
          )
        : [],
    [products, selectedProductIds, itemSearch],
  );
  const filteredServices = useMemo(
    () =>
      itemSearch
        ? services.filter(
            (s) =>
              !selectedServiceIds.includes(s.id) &&
              s.name.toLowerCase().includes(itemSearch.toLowerCase()),
          )
        : [],
    [services, selectedServiceIds, itemSearch],
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {/* Selected items */}
      {(selectedProducts.length > 0 || selectedServices.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map((p) => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              {p.name}
              <button
                type="button"
                onClick={() =>
                  onProductsChange(selectedProductIds.filter((id) => id !== p.id))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedServices.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
              {s.name}
              <button
                type="button"
                onClick={() =>
                  onServicesChange(selectedServiceIds.filter((id) => id !== s.id))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("loyaltyPromoSearchItems")}
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          className="pl-7 h-8 text-sm"
        />
      </div>

      {/* Results */}
      {itemSearch && (
        <div className="max-h-36 overflow-y-auto space-y-2 border rounded-md p-2">
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
                  onClick={() => {
                    onProductsChange([...selectedProductIds, prod.id]);
                    setItemSearch("");
                  }}
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
                  onClick={() => {
                    onServicesChange([...selectedServiceIds, svc.id]);
                    setItemSearch("");
                  }}
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
          {filteredProducts.length === 0 && filteredServices.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              {t("loyaltyPromoNoResults")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface LoyaltyPromotionsClientProps {
  initialData: LoyaltyPromosData;
}

export function LoyaltyPromotionsClient({ initialData }: LoyaltyPromotionsClientProps) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { formatDate: fmtDate } = useFormatDate();

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
  const [formDescription, setFormDescription] = useState("");
  const [formThreshold, setFormThreshold] = useState("5");
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formAvailableOnline, setFormAvailableOnline] = useState(false);
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formQualifyingProductIds, setFormQualifyingProductIds] = useState<string[]>([]);
  const [formQualifyingServiceIds, setFormQualifyingServiceIds] = useState<string[]>([]);
  const [formRewardProductIds, setFormRewardProductIds] = useState<string[]>([]);
  const [formRewardServiceIds, setFormRewardServiceIds] = useState<string[]>([]);

  // POS data
  const [posData, setPosData] = useState<PosData | null>(null);
  const [posLoading, setPosLoading] = useState(false);

  const loadData = useCallback(
    async (s?: string, p?: number) => {
      setLoading(true);
      try {
        const result = await getLoyaltyPromotions(s || undefined, p ?? 1);
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadData]);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormThreshold("5");
    setFormIsRecurring(true);
    setFormAvailableOnline(false);
    setFormStartsAt("");
    setFormEndsAt("");
    setFormQualifyingProductIds([]);
    setFormQualifyingServiceIds([]);
    setFormRewardProductIds([]);
    setFormRewardServiceIds([]);
    setEditId(null);
  }

  function openCreate() {
    resetForm();
    const today = new Date().toISOString().split("T")[0];
    setFormStartsAt(today);
    setShowDialog(true);
  }

  async function openEdit(promo: LoyaltyPromoRow) {
    setEditId(promo.id);
    setSaving(true);
    setShowDialog(true);
    try {
      const full = await getLoyaltyPromotion(promo.id);
      if (!full) return;
      setFormName(full.name);
      setFormDescription(full.description ?? "");
      setFormThreshold(String(full.threshold));
      setFormIsRecurring(full.isRecurring);
      setFormAvailableOnline(full.availableOnline);
      setFormStartsAt(toDateInputValue(full.startsAt));
      setFormEndsAt(toDateInputValue(full.endsAt));

      const qualifying = full.items.filter((i) => i.role === "QUALIFYING");
      const rewards = full.items.filter((i) => i.role === "REWARD");
      setFormQualifyingProductIds(qualifying.filter((i) => i.productId).map((i) => i.productId!));
      setFormQualifyingServiceIds(qualifying.filter((i) => i.serviceId).map((i) => i.serviceId!));
      setFormRewardProductIds(rewards.filter((i) => i.productId).map((i) => i.productId!));
      setFormRewardServiceIds(rewards.filter((i) => i.serviceId).map((i) => i.serviceId!));
    } finally {
      setSaving(false);
    }
  }

  // Load POS data when dialog opens
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
        description: formDescription || undefined,
        threshold: parseInt(formThreshold, 10) || 5,
        isRecurring: formIsRecurring,
        availableOnline: formAvailableOnline,
        startsAt: formStartsAt,
        endsAt: formEndsAt,
        qualifyingProductIds: formQualifyingProductIds,
        qualifyingServiceIds: formQualifyingServiceIds,
        rewardProductIds: formRewardProductIds,
        rewardServiceIds: formRewardServiceIds,
      };

      if (editId) {
        await updateLoyaltyPromotion(editId, base);
      } else {
        await createLoyaltyPromotion(base);
      }

      setShowDialog(false);
      resetForm();
      await loadData(search, page);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(promo: LoyaltyPromoRow) {
    await toggleLoyaltyPromotion(promo.id);
    await loadData(search, page);
    router.refresh();
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await loadData(search, newPage);
  }

  function getStatus(promo: LoyaltyPromoRow) {
    const now = new Date();
    const start = new Date(promo.startsAt);
    const end = new Date(promo.endsAt);
    if (!promo.isActive) return "inactive";
    if (now > end) return "expired";
    if (now < start) return "scheduled";
    return "active";
  }

  function statusBadge(promo: LoyaltyPromoRow) {
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

  function formatDateRange(promo: LoyaltyPromoRow) {
    return `${fmtDate(promo.startsAt)} - ${fmtDate(promo.endsAt)}`;
  }

  function getQualifyingItems(promo: LoyaltyPromoRow) {
    return promo.items
      .filter((i) => i.role === "QUALIFYING")
      .map((i) => i.product?.name ?? i.service?.name ?? "?")
      .join(", ");
  }

  function getRewardItems(promo: LoyaltyPromoRow) {
    return promo.items
      .filter((i) => i.role === "REWARD")
      .map((i) => i.product?.name ?? i.service?.name ?? "?")
      .join(", ");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("loyaltyPromotionsTitle")} backHref={`/app/${organization.slug}/settings`}>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> {t("loyaltyPromoNew")}
        </Button>
      </PageHeader>

      <p className="text-sm text-muted-foreground -mt-4">
        {t("loyaltyPromotionsHelp")}
      </p>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("loyaltyPromoSearch")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {data.items.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Award className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("loyaltyPromoEmpty")}
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
                        {statusBadge(promo)}
                        {promo.availableOnline && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {t("promoOnlineBadge")}
                          </Badge>
                        )}
                        {promo.isRecurring && (
                          <Badge variant="outline">{t("loyaltyPromoRecurring")}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("loyaltyPromoThresholdDisplay", { count: promo.threshold })} &middot; {formatDateRange(promo)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {t("loyaltyPromoRewardLabel")}: {getRewardItems(promo)}
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
                  <TableHead>{t("loyaltyPromoThreshold")}</TableHead>
                  <TableHead>{t("loyaltyPromoQualifying")}</TableHead>
                  <TableHead>{t("loyaltyPromoReward")}</TableHead>
                  <TableHead>{t("promoDateRange")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("loyaltyPromoCustomers")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.name}</TableCell>
                    <TableCell>{promo.threshold}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{getQualifyingItems(promo)}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{getRewardItems(promo)}</TableCell>
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
                    <TableCell>{promo._count.progress}</TableCell>
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
            <DialogTitle>{editId ? t("loyaltyPromoEdit") : t("loyaltyPromoNew")}</DialogTitle>
            <DialogDescription>{t("loyaltyPromoDialogDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>{t("promoName")} *</Label>
                <Input required autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>{t("loyaltyPromoDescription")}</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Threshold */}
              <div className="space-y-1.5">
                <Label>{t("loyaltyPromoThreshold")} *</Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("loyaltyPromoThresholdHelp")}</p>
              </div>

              {/* Qualifying items */}
              {posData && !posLoading && (
                <div className="space-y-1">
                  <ItemPicker
                    products={posData.products}
                    services={posData.services}
                    selectedProductIds={formQualifyingProductIds}
                    selectedServiceIds={formQualifyingServiceIds}
                    onProductsChange={setFormQualifyingProductIds}
                    onServicesChange={setFormQualifyingServiceIds}
                    label={t("loyaltyPromoQualifyingLabel")}
                    t={t}
                  />
                  <p className="text-xs text-muted-foreground">{t("loyaltyPromoQualifyingHelp")}</p>
                </div>
              )}

              {/* Reward items */}
              {posData && !posLoading && (
                <div className="space-y-1">
                  <ItemPicker
                    products={posData.products}
                    services={posData.services}
                    selectedProductIds={formRewardProductIds}
                    selectedServiceIds={formRewardServiceIds}
                    onProductsChange={setFormRewardProductIds}
                    onServicesChange={setFormRewardServiceIds}
                    label={t("loyaltyPromoRewardLabel")}
                    t={t}
                  />
                  <p className="text-xs text-muted-foreground">{t("loyaltyPromoRewardHelp")}</p>
                </div>
              )}

              {posLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">{tc("loading")}</p>
              )}

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

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recurring"
                    checked={formIsRecurring}
                    onCheckedChange={(checked) => setFormIsRecurring(checked === true)}
                  />
                  <Label htmlFor="recurring" className="text-sm font-normal cursor-pointer">
                    {t("loyaltyPromoRecurringLabel")}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">{t("loyaltyPromoRecurringHelp")}</p>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="loyalty-promo-online"
                    checked={formAvailableOnline}
                    onCheckedChange={(checked) => setFormAvailableOnline(checked === true)}
                  />
                  <Label htmlFor="loyalty-promo-online" className="text-sm font-normal cursor-pointer">
                    {t("promoAvailableOnline")}
                  </Label>
                </div>
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
