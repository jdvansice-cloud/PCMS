"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/lib/use-format-date";
import {
  Plus,
  Search,
  Gift,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Eye,
  Pencil,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { formatCurrency } from "@/lib/utils";
import {
  getGiftCardProducts,
  createGiftCardProduct,
  updateGiftCardProduct,
  toggleGiftCardProduct,
} from "../actions";
import {
  getGiftCards,
  getGiftCard,
  cancelGiftCard,
} from "../actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type GiftCardProductRow = Awaited<ReturnType<typeof getGiftCardProducts>>[number];

type GiftCardsResult = Awaited<ReturnType<typeof getGiftCards>>;
type GiftCardRow = GiftCardsResult["items"][number];
type GiftCardDetail = Awaited<ReturnType<typeof getGiftCard>>;

interface GiftCardsClientProps {
  denominations: GiftCardProductRow[];
  initialCards: GiftCardsResult;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GiftCardsClient({
  denominations: initialDenominations,
  initialCards,
}: GiftCardsClientProps) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { formatDate: fmtDate } = useFormatDate();

  // ── Denomination state ──────────────────────────────────────────────────
  const [denominations, setDenominations] =
    useState<GiftCardProductRow[]>(initialDenominations);
  const [showDenomDialog, setShowDenomDialog] = useState(false);
  const [editingDenom, setEditingDenom] =
    useState<GiftCardProductRow | null>(null);
  const [denomSaving, setDenomSaving] = useState(false);
  const [denomToggling, setDenomToggling] = useState<string | null>(null);
  const [denomAmount, setDenomAmount] = useState("");

  // ── Issued cards state ──────────────────────────────────────────────────
  const [giftCards, setGiftCards] = useState<GiftCardRow[]>(
    initialCards.items,
  );
  const [total, setTotal] = useState(initialCards.total);
  const [totalPages, setTotalPages] = useState(initialCards.totalPages);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [detailCard, setDetailCard] = useState<GiftCardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────

  async function reloadDenominations() {
    const data = await getGiftCardProducts();
    setDenominations(data);
  }

  const loadCards = useCallback(
    async (s?: string, p?: number) => {
      const data = await getGiftCards(s ?? search, p ?? page);
      setGiftCards(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    },
    [search, page],
  );

  // ── Denomination handlers ───────────────────────────────────────────────

  function openCreateDenom() {
    setEditingDenom(null);
    setDenomAmount("");
    setShowDenomDialog(true);
  }

  function openEditDenom(denom: GiftCardProductRow) {
    setEditingDenom(denom);
    setDenomAmount(String(denom.amount));
    setShowDenomDialog(true);
  }

  async function handleDenomSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDenomSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const name = fd.get("name") as string;
      const amount = parseFloat(fd.get("amount") as string);
      const expDaysRaw = fd.get("expirationDays") as string;
      const expirationDays = expDaysRaw ? parseInt(expDaysRaw, 10) : undefined;

      if (editingDenom) {
        await updateGiftCardProduct(editingDenom.id, {
          name,
          amount,
          expirationDays,
          isActive: editingDenom.isActive,
        });
      } else {
        await createGiftCardProduct({ name, amount, expirationDays });
      }

      setShowDenomDialog(false);
      setEditingDenom(null);
      await reloadDenominations();
      router.refresh();
    } finally {
      setDenomSaving(false);
    }
  }

  async function handleToggleDenom(id: string) {
    setDenomToggling(id);
    try {
      await toggleGiftCardProduct(id);
      await reloadDenominations();
      router.refresh();
    } finally {
      setDenomToggling(null);
    }
  }

  // ── Issued cards handlers ───────────────────────────────────────────────

  async function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    await loadCards(value, 1);
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await loadCards(search, newPage);
  }

  async function handleCancel(id: string) {
    if (!confirm(t("giftCardCancelConfirm"))) return;
    setCancelling(id);
    try {
      await cancelGiftCard(id);
      await loadCards();
      router.refresh();
    } finally {
      setCancelling(null);
    }
  }

  async function handleViewDetail(card: GiftCardRow) {
    setDetailLoading(true);
    try {
      const detail = await getGiftCard(card.id);
      setDetailCard(detail);
    } finally {
      setDetailLoading(false);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  function suggestedName(amount: string) {
    const n = parseFloat(amount);
    if (!amount || isNaN(n)) return "";
    return `Gift Card $${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  function statusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            {t("giftCardActive")}
          </Badge>
        );
      case "DEPLETED":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            {t("giftCardDepleted")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            {t("giftCardExpired")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            {t("giftCardCancelled")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function formatDate(date: string | Date | null | undefined) {
    if (!date) return "---";
    return fmtDate(date);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 1: Denominations                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div className="space-y-6">
        <PageHeader title={t("giftCardsTitle")} backHref={`/app/${organization.slug}/settings`}>
          <Button size="sm" className="gap-1.5" onClick={openCreateDenom}>
            <Plus className="h-4 w-4" /> {t("newDenomination")}
          </Button>
        </PageHeader>

        {denominations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Gift className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("noDenominations")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("noDenominationsDesc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 sm:hidden">
              {denominations.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(Number(d.amount))}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {d.isActive ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              {t("giftCardActive")}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                              {tc("inactive")}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {d.expirationDays
                              ? `${d.expirationDays} ${t("denominationExpDays").toLowerCase()}`
                              : "---"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDenom(d)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={denomToggling === d.id}
                          onClick={() => handleToggleDenom(d.id)}
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
                    <TableHead>{tc("name")}</TableHead>
                    <TableHead className="text-right">
                      {t("denominationAmount")}
                    </TableHead>
                    <TableHead>{t("denominationExpDays")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">
                      {tc("actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {denominations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(d.amount))}
                      </TableCell>
                      <TableCell>
                        {d.expirationDays ? d.expirationDays : "---"}
                      </TableCell>
                      <TableCell>
                        {d.isActive ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {t("giftCardActive")}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                            {tc("inactive")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openEditDenom(d)}
                          >
                            <Pencil className="h-4 w-4" /> {tc("edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            disabled={denomToggling === d.id}
                            onClick={() => handleToggleDenom(d.id)}
                          >
                            <Power className="h-4 w-4" />{" "}
                            {denomToggling === d.id
                              ? tc("loading")
                              : d.isActive
                                ? tc("deactivate")
                                : tc("activate")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Section 2: Issued Cards                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <div className="space-y-6">
        <div className="border-b border-border pb-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("issuedCards")}
          </h2>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("giftCardSearchPlaceholder")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {giftCards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Gift className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("noGiftCards")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 sm:hidden">
              {giftCards.map((gc) => (
                <Card key={gc.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-medium truncate">
                          {gc.code}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {t("giftCardInitial")}:{" "}
                            {formatCurrency(Number(gc.initialBalance))}
                          </span>
                          <span className="text-xs font-medium">
                            {t("giftCardCurrent")}:{" "}
                            {formatCurrency(Number(gc.balance))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {statusBadge(gc.status)}
                          {gc.expiresAt && (
                            <span className="text-xs text-muted-foreground">
                              {t("giftCardExpires")}:{" "}
                              {formatDate(gc.expiresAt)}
                            </span>
                          )}
                        </div>
                        {gc.purchasedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("giftCardPurchasedBy")}:{" "}
                            {gc.purchasedBy.firstName} {gc.purchasedBy.lastName}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(gc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {gc.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={cancelling === gc.id}
                            onClick={() => handleCancel(gc.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
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
                    <TableHead>{t("giftCardCode")}</TableHead>
                    <TableHead className="text-right">
                      {t("giftCardInitialBalance")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("giftCardCurrentBalance")}
                    </TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("giftCardExpires")}</TableHead>
                    <TableHead>{t("giftCardPurchasedBy")}</TableHead>
                    <TableHead className="text-right">
                      {tc("actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftCards.map((gc) => (
                    <TableRow key={gc.id}>
                      <TableCell className="font-mono font-medium">
                        {gc.code}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(gc.initialBalance))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(gc.balance))}
                      </TableCell>
                      <TableCell>{statusBadge(gc.status)}</TableCell>
                      <TableCell>{formatDate(gc.expiresAt)}</TableCell>
                      <TableCell>
                        {gc.purchasedBy
                          ? `${gc.purchasedBy.firstName} ${gc.purchasedBy.lastName}`
                          : "---"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleViewDetail(gc)}
                          >
                            <Eye className="h-4 w-4" /> {t("giftCardDetails")}
                          </Button>
                          {gc.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive gap-1.5"
                              disabled={cancelling === gc.id}
                              onClick={() => handleCancel(gc.id)}
                            >
                              <XCircle className="h-4 w-4" />{" "}
                              {cancelling === gc.id
                                ? tc("loading")
                                : t("giftCardCancel")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("giftCardTotal", { count: total })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Denomination Create/Edit Dialog                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <Dialog
        open={showDenomDialog}
        onOpenChange={(open) => {
          setShowDenomDialog(open);
          if (!open) setEditingDenom(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDenom ? t("editDenomination") : t("newDenomination")}
            </DialogTitle>
            <DialogDescription>
              {t("giftCardDenominations")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDenomSubmit}>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>{t("denominationAmount")} *</Label>
                <Input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  defaultValue={editingDenom ? String(editingDenom.amount) : ""}
                  onChange={(e) => setDenomAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("name")} *</Label>
                <Input
                  name="name"
                  required
                  placeholder={suggestedName(denomAmount) || "Gift Card $25"}
                  defaultValue={
                    editingDenom
                      ? editingDenom.name
                      : suggestedName(denomAmount)
                  }
                  key={editingDenom?.id ?? "new"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("denominationExpDays")}</Label>
                <Input
                  name="expirationDays"
                  type="number"
                  min="1"
                  step="1"
                  placeholder=""
                  defaultValue={
                    editingDenom?.expirationDays
                      ? String(editingDenom.expirationDays)
                      : ""
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("denominationExpDaysHint")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDenomDialog(false);
                  setEditingDenom(null);
                }}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={denomSaving} size="sm">
                {denomSaving ? tc("loading") : tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Gift Card Detail Dialog                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <Dialog
        open={!!detailCard}
        onOpenChange={(open) => !open && setDetailCard(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("giftCardDetails")} — {detailCard?.code}
            </DialogTitle>
            <DialogDescription>{t("giftCardDetailDesc")}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {tc("loading")}
            </div>
          ) : detailCard ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("giftCardCode")}</p>
                  <p className="font-mono font-medium">{detailCard.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("status")}</p>
                  <div className="mt-0.5">{statusBadge(detailCard.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("giftCardInitialBalance")}
                  </p>
                  <p className="font-medium">
                    {formatCurrency(Number(detailCard.initialBalance))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("giftCardCurrentBalance")}
                  </p>
                  <p className="font-medium">
                    {formatCurrency(Number(detailCard.balance))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("giftCardExpires")}
                  </p>
                  <p>{formatDate(detailCard.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("giftCardPurchasedBy")}
                  </p>
                  <p>
                    {detailCard?.purchasedBy
                      ? `${detailCard.purchasedBy.firstName} ${detailCard.purchasedBy.lastName}`
                      : "---"}
                  </p>
                </div>
                {detailCard.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">
                      {t("giftCardNotes")}
                    </p>
                    <p>{detailCard.notes}</p>
                  </div>
                )}
              </div>

              {/* Transaction History */}
              {detailCard.transactions &&
                detailCard.transactions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      {t("giftCardTransactions")}
                    </h4>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("giftCardTxDate")}</TableHead>
                            <TableHead>{t("giftCardTxType")}</TableHead>
                            <TableHead>{t("giftCardTxBy")}</TableHead>
                            <TableHead className="text-right">
                              {t("giftCardTxAmount")}
                            </TableHead>
                            <TableHead className="text-right">
                              {t("giftCardTxBalance")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailCard.transactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs">
                                {formatDate(tx.createdAt)}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-[10px]">
                                  {t(`giftCardTxTypeLabels.${tx.type}`)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {tx.type === "REDEMPTION" && tx.sale?.owner
                                  ? `${tx.sale.owner.firstName} ${tx.sale.owner.lastName}`
                                  : tx.createdBy
                                    ? `${tx.createdBy.firstName} ${tx.createdBy.lastName}`
                                    : "—"}
                              </TableCell>
                              <TableCell className={`text-xs text-right ${tx.type === "REDEMPTION" ? "text-destructive" : "text-green-600"}`}>
                                {tx.type === "REDEMPTION" ? "-" : "+"}{formatCurrency(Math.abs(Number(tx.amount)))}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium">
                                {formatCurrency(Number(tx.balanceAfter))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailCard(null)}
            >
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
