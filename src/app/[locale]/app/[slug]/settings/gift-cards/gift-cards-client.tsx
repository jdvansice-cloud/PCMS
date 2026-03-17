"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Plus,
  Search,
  Gift,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Eye,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { formatCurrency } from "@/lib/utils";
import {
  getGiftCards,
  createGiftCard,
  bulkCreateGiftCards,
  cancelGiftCard,
  getGiftCard,
} from "../actions";

type GiftCardsResult = Awaited<ReturnType<typeof getGiftCards>>;
type GiftCardRow = GiftCardsResult["items"][number];
type GiftCardDetail = Awaited<ReturnType<typeof getGiftCard>>;

interface GiftCardsClientProps {
  initialData: GiftCardsResult;
}

export function GiftCardsClient({ initialData }: GiftCardsClientProps) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [giftCards, setGiftCards] = useState<GiftCardRow[]>(
    initialData.items,
  );
  const [total, setTotal] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isBulk, setIsBulk] = useState(false);

  const [detailCard, setDetailCard] = useState<GiftCardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadData = useCallback(
    async (s?: string, p?: number) => {
      const data = await getGiftCards(s ?? search, p ?? page);
      setGiftCards(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    },
    [search, page],
  );

  async function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    await loadData(value, 1);
  }

  async function handlePageChange(newPage: number) {
    setPage(newPage);
    await loadData(search, newPage);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const fd = new FormData(e.currentTarget);
      const amount = parseFloat(fd.get("amount") as string);
      const expirationDays = parseInt(fd.get("expirationDays") as string, 10);
      const notes = (fd.get("notes") as string) || undefined;

      if (isBulk) {
        const quantity = parseInt(fd.get("quantity") as string, 10);
        await bulkCreateGiftCards({ initialBalance: amount, expirationDays, quantity });
      } else {
        await createGiftCard({ initialBalance: amount, expirationDays, notes });
      }

      setShowCreate(false);
      setIsBulk(false);
      setPage(1);
      await loadData("", 1);
      setSearch("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm(t("giftCardCancelConfirm"))) return;
    setCancelling(id);
    try {
      await cancelGiftCard(id);
      await loadData();
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
    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("giftCardsTitle")}>
        <div className="flex items-center gap-2">
          <Link href={`/app/${organization.slug}/settings`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToSettings")}
            </Button>
          </Link>
          <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setIsBulk(false); }}>
            <DialogTrigger
              render={<Button size="sm" className="gap-1.5" />}
            >
              <Plus className="h-4 w-4" /> {t("newGiftCard")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("newGiftCard")}</DialogTitle>
                <DialogDescription>
                  {t("giftCardCreateDesc")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label>{t("giftCardAmount")} *</Label>
                    <Input
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      autoFocus
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("giftCardExpirationDays")}</Label>
                    <Input
                      name="expirationDays"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="365"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("giftCardExpirationHint")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("giftCardNotes")}</Label>
                    <textarea
                      name="notes"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder={t("giftCardNotesPlaceholder")}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isBulk}
                      onCheckedChange={(checked) =>
                        setIsBulk(checked === true)
                      }
                    />
                    <Label className="cursor-pointer" onClick={() => setIsBulk(!isBulk)}>
                      {t("giftCardBulkCreate")}
                    </Label>
                  </div>
                  {isBulk && (
                    <div className="space-y-1.5">
                      <Label>{t("giftCardQuantity")} *</Label>
                      <Input
                        name="quantity"
                        type="number"
                        min="2"
                        max="100"
                        step="1"
                        required
                        defaultValue="5"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreate(false);
                      setIsBulk(false);
                    }}
                  >
                    {tc("cancel")}
                  </Button>
                  <Button type="submit" disabled={creating} size="sm">
                    {creating ? tc("loading") : tc("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

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
                          {t("giftCardInitial")}: {formatCurrency(Number(gc.initialBalance))}
                        </span>
                        <span className="text-xs font-medium">
                          {t("giftCardCurrent")}: {formatCurrency(Number(gc.balance))}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {statusBadge(gc.status)}
                        {gc.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            {t("giftCardExpires")}: {formatDate(gc.expiresAt)}
                          </span>
                        )}
                      </div>
                      {gc.purchasedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("giftCardPurchasedBy")}: {gc.purchasedBy.firstName} {gc.purchasedBy.lastName}
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
                  <TableHead className="text-right">{tc("actions")}</TableHead>
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
                    <TableCell>{gc.purchasedBy ? `${gc.purchasedBy.firstName} ${gc.purchasedBy.lastName}` : "---"}</TableCell>
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

      {/* Detail Dialog */}
      <Dialog
        open={!!detailCard}
        onOpenChange={(open) => !open && setDetailCard(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("giftCardDetails")} — {detailCard?.code}
            </DialogTitle>
            <DialogDescription>
              {t("giftCardDetailDesc")}
            </DialogDescription>
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
                  <p>{detailCard?.purchasedBy ? `${detailCard.purchasedBy.firstName} ${detailCard.purchasedBy.lastName}` : "---"}</p>
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
              {detailCard.transactions && detailCard.transactions.length > 0 && (
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
                          <TableHead className="text-right">
                            {t("giftCardTxAmount")}
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
                              {tx.type}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {formatCurrency(Number(tx.amount))}
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
