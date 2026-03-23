import { notFound } from "next/navigation";
import { Receipt, Tag, Gift, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { getSale } from "../../actions";
import { getOrgDateSettings, formatDateServer } from "@/lib/format-date";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  YAPPY: "Yappy",
  BANK_TRANSFER: "Transferencia",
  GIFT_CARD: "Tarjeta de Regalo",
  LOYALTY: "Lealtad",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  const t = await getTranslations("pos");
  const orgDate = await getOrgDateSettings();
  const base = `/app/${slug}/pos`;
  const hasDiscount = Number(sale.discountAmount) > 0;
  const hasPromos = sale.promotions && sale.promotions.length > 0;
  const hasGiftCards = sale.giftCardTxs && sale.giftCardTxs.length > 0;
  const loyaltyEarned = sale.loyaltyTxs?.find((tx) => tx.type === "EARNED");
  const loyaltyRedeemed = sale.loyaltyTxs?.find((tx) => tx.type === "REDEEMED");

  return (
    <div className="space-y-6">
      <PageHeader title={`${t("saleDetail")} #${sale.saleNumber}`} backHref={`${base}/sales`} />

      <Card className="max-w-lg">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span className="font-bold text-lg">#{sale.saleNumber}</span>
            </div>
            <Badge variant="secondary">{sale.status}</Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {formatDateServer(sale.createdAt, orgDate.timezone, orgDate.locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {sale.owner && (
            <div className="text-sm">
              <span className="text-muted-foreground">{t("client")}:</span>{" "}
              {sale.owner.firstName} {sale.owner.lastName}
            </div>
          )}

          <Separator />

          {/* Line items */}
          <div className="space-y-2">
            {sale.lines.map((line) => {
              const lineDisc = Number(line.discountAmount) || 0;
              return (
                <div key={line.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <span>{line.description}</span>
                    {line.quantity > 1 && (
                      <span className="text-muted-foreground ml-1">x{line.quantity}</span>
                    )}
                    {lineDisc > 0 && (
                      <span className="text-green-600 text-xs ml-2">
                        -{line.discountType === "PERCENTAGE"
                          ? `${lineDisc}%`
                          : formatCurrency(lineDisc)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(Number(line.lineTotal))}</span>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-between text-green-600">
                <span>{t("discount")}</span>
                <span>-{formatCurrency(Number(sale.discountAmount))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("itbms")} (7%)</span>
              <span>{formatCurrency(Number(sale.itbms))}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1">
              <span>Total</span>
              <span>{formatCurrency(Number(sale.total))}</span>
            </div>
          </div>

          <Separator />

          {/* Payment breakdown */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t("paymentBreakdown")}
            </span>
            {sale.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                </span>
                <span>{formatCurrency(Number(p.amount))}</span>
              </div>
            ))}
            {loyaltyRedeemed && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {t("loyaltyRedeemed")}
                </span>
                <span>{formatCurrency(Math.abs(Number(loyaltyRedeemed.amount)))}</span>
              </div>
            )}
          </div>

          {/* Gift card details */}
          {hasGiftCards && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" /> {t("giftCard")}
                </span>
                {sale.giftCardTxs!.map((tx) => (
                  <div key={tx.id} className="flex justify-between text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {tx.giftCard.code}
                    </span>
                    <span>{formatCurrency(Math.abs(Number(tx.amount)))}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Promotions applied */}
          {hasPromos && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> {t("promotionsApplied")}
                </span>
                {sale.promotions!.map((sp) => (
                  <div key={sp.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {sp.promotion.name}
                    </span>
                    <span className="text-green-600">
                      -{formatCurrency(Number(sp.discountAmount))}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Loyalty earned */}
          {loyaltyEarned && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  {t("loyaltyEarned")}
                </span>
                <span className="font-medium text-yellow-600">
                  +{formatCurrency(Number(loyaltyEarned.amount))}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
