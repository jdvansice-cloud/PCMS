"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Printer, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import type { EndOfDayReport } from "../actions";

export function ClosingReport({
  report,
  slug,
}: {
  report: EndOfDayReport;
  slug: string;
}) {
  const t = useTranslations("posClosing");
  const tc = useTranslations("common");
  const tp = useTranslations("pos");
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const base = `/app/${slug}/pos`;

  const [actualCash, setActualCash] = useState<string>("");
  const [showSales, setShowSales] = useState(false);
  const [date, setDate] = useState(report.date);

  const actualCashNum = parseFloat(actualCash) || 0;
  const cashDifference = actualCashNum - report.expectedCash;

  function methodLabel(m: string) {
    const labels: Record<string, string> = {
      CASH: tp("cash"),
      CARD: tp("card"),
      YAPPY: tp("yappy"),
      BANK_TRANSFER: tp("bankTransfer"),
      GIFT_CARD: tp("giftCard"),
      LOYALTY: tp("loyalty"),
    };
    return labels[m] || m;
  }

  function handlePrint() {
    window.print();
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    router.push(`${base}/closing?date=${newDate}`);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Screen-only header */}
      <div className="print:hidden">
        <PageHeader title={t("title")} backHref={base}>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-8 text-sm w-auto"
            />
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              {t("print")}
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Printable report */}
      <div ref={printRef} className="print:p-0">
        {/* Print header */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-xl font-bold">{report.organizationName}</h1>
          <p className="text-sm text-muted-foreground">{report.branchName}</p>
          <h2 className="text-lg font-semibold mt-2">{t("title")}</h2>
          <p className="text-sm">{t("reportDate")}: {report.date}</p>
          <p className="text-sm">{t("closedBy")}: {report.closedBy}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 print:grid-cols-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("totalSales")}</p>
              <p className="text-xl font-bold">{report.salesCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("grossSales")}</p>
              <p className="text-xl font-bold">{formatCurrency(report.grossSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("discounts")}</p>
              <p className="text-xl font-bold text-green-600">
                {report.totalDiscounts > 0 ? `-${formatCurrency(report.totalDiscounts)}` : formatCurrency(0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{t("netSales")}</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(report.netSales)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Breakdown */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t("paymentBreakdown")}</h3>
            <div className="space-y-1.5">
              {report.paymentBreakdown.map((p) => (
                <div key={p.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{methodLabel(p.method)}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.count}x
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(p.total)}</span>
                </div>
              ))}
              {report.paymentBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">{t("noSales")}</p>
              )}
              <div className="flex items-center justify-between text-sm font-bold border-t pt-1.5 mt-1.5">
                <span>{tc("total")}</span>
                <span>{formatCurrency(report.netSales)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Reconciliation */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t("cashReconciliation")}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("expectedCash")}</span>
                <span className="font-medium">{formatCurrency(report.expectedCash)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="shrink-0">{t("actualCash")}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="h-7 text-sm w-28 text-right print:border-0 print:bg-transparent"
                />
              </div>
              {actualCash && (
                <div className={`flex items-center justify-between text-sm font-bold border-t pt-1.5 ${
                  Math.abs(cashDifference) < 0.01
                    ? "text-green-600"
                    : cashDifference > 0
                      ? "text-blue-600"
                      : "text-destructive"
                }`}>
                  <span>{t("difference")}</span>
                  <span>
                    {cashDifference > 0 ? "+" : ""}
                    {formatCurrency(cashDifference)}
                    {Math.abs(cashDifference) < 0.01 && ` (${t("balanced")})`}
                    {cashDifference > 0.01 && ` (${t("over")})`}
                    {cashDifference < -0.01 && ` (${t("short")})`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tax Summary */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t("taxSummary")}</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>{t("subtotalPreTax")}</span>
                <span>{formatCurrency(report.grossSales - report.totalItbms)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("itbmsCollected")}</span>
                <span>{formatCurrency(report.totalItbms)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1.5">
                <span>{t("grossSales")}</span>
                <span>{formatCurrency(report.grossSales)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 mt-4">
          {/* Products */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">{t("productSales")}</h3>
              {report.productSales.length > 0 ? (
                <div className="space-y-1">
                  {report.productSales.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate mr-2">{p.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{p.qty}x</span>
                        <span className="font-medium w-16 text-right">{formatCurrency(p.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                    <span>{tc("total")}</span>
                    <span>{formatCurrency(report.productSales.reduce((s, p) => s + p.total, 0))}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">{t("noProducts")}</p>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">{t("serviceSales")}</h3>
              {report.serviceSales.length > 0 ? (
                <div className="space-y-1">
                  {report.serviceSales.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate mr-2">{s.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{s.qty}x</span>
                        <span className="font-medium w-16 text-right">{formatCurrency(s.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                    <span>{tc("total")}</span>
                    <span>{formatCurrency(report.serviceSales.reduce((s, p) => s + p.total, 0))}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">{t("noServices")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gift Cards & Refunds */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t("giftCardsAndRefunds")}</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span>{t("giftCardsSold")} ({report.giftCardSales.count})</span>
                <span>{formatCurrency(report.giftCardSales.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("giftCardsRedeemed")} ({report.giftCardRedemptions.count})</span>
                <span>{formatCurrency(report.giftCardRedemptions.total)}</span>
              </div>
              {report.refundsCount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>{t("refunds")} ({report.refundsCount})</span>
                  <span>-{formatCurrency(report.totalRefunds)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Sellers */}
        {report.topItems.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">{t("topSellers")}</h3>
              <div className="space-y-1">
                {report.topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">{item.qty}x</span>
                      <span className="font-medium w-16 text-right">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Sales (collapsible on screen, always visible in print) */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <button
              onClick={() => setShowSales(!showSales)}
              className="flex items-center justify-between w-full text-sm font-semibold print:pointer-events-none"
            >
              <span>{t("salesDetail")} ({report.salesCount})</span>
              <span className="print:hidden">
                {showSales ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            <div className={`mt-3 ${showSales ? "" : "hidden"} print:block`}>
              {report.sales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-1.5 font-medium">#</th>
                        <th className="pb-1.5 font-medium">{t("time")}</th>
                        <th className="pb-1.5 font-medium">{t("customer")}</th>
                        <th className="pb-1.5 font-medium text-center">{t("items")}</th>
                        <th className="pb-1.5 font-medium text-right">{tc("total")}</th>
                        <th className="pb-1.5 font-medium text-right">{t("paymentMethod")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sales.map((sale) => (
                        <tr key={sale.saleNumber} className="border-b last:border-0">
                          <td className="py-1.5">{sale.saleNumber}</td>
                          <td className="py-1.5">{sale.time}</td>
                          <td className="py-1.5">{sale.customer || <span className="text-muted-foreground">{tp("walkIn")}</span>}</td>
                          <td className="py-1.5 text-center">{sale.items}</td>
                          <td className="py-1.5 text-right font-medium">{formatCurrency(sale.total)}</td>
                          <td className="py-1.5 text-right">
                            {sale.payments.map((p, i) => (
                              <span key={i}>
                                {i > 0 && " + "}
                                {methodLabel(p.method)} {formatCurrency(p.amount)}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t("noSales")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>{t("closedBy")}: {report.closedBy} | {new Date().toLocaleString()}</p>
          {actualCash && (
            <p className="mt-1">
              {t("actualCash")}: {formatCurrency(actualCashNum)} | {t("difference")}: {cashDifference > 0 ? "+" : ""}{formatCurrency(cashDifference)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
