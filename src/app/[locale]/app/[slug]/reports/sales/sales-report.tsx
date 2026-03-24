"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSalesReport, type SalesReportInput } from "../actions";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  Printer,
  Download,
} from "lucide-react";

type Props = {
  slug: string;
  filters: {
    vets: { id: string; firstName: string; lastName: string }[];
    groomers: { id: string; firstName: string; lastName: string }[];
  };
};

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function pct(n: number) {
  return n.toFixed(1) + "%";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function lastYearRange(from: string, to: string) {
  const f = new Date(from);
  const t = new Date(to);
  f.setFullYear(f.getFullYear() - 1);
  t.setFullYear(t.getFullYear() - 1);
  return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) };
}

type ReportData = Awaited<ReturnType<typeof getSalesReport>>;

export function SalesReport({ slug, filters }: Props) {
  const t = useTranslations("reports");
  const ct = useTranslations("common");
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<ReportData | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [comparative, setComparative] = useState(
    searchParams.get("comparative") === "true"
  );
  const defaultCompare = lastYearRange(dateFrom, dateTo);
  const [compareFrom, setCompareFrom] = useState(defaultCompare.from);
  const [compareTo, setCompareTo] = useState(defaultCompare.to);
  const [viewMode, setViewMode] = useState<"summary" | "detailed">(
    "summary"
  );
  const [categories, setCategories] = useState<
    ("CLINIC" | "GROOMING" | "PRODUCT")[]
  >(["CLINIC", "GROOMING", "PRODUCT"]);
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  function toggleCategory(cat: "CLINIC" | "GROOMING" | "PRODUCT") {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  // Update compare dates when period A changes
  function handleDateFromChange(val: string) {
    setDateFrom(val);
    const lr = lastYearRange(val, dateTo);
    setCompareFrom(lr.from);
    setCompareTo(lr.to);
  }

  function handleDateToChange(val: string) {
    setDateTo(val);
    const lr = lastYearRange(dateFrom, val);
    setCompareFrom(lr.from);
    setCompareTo(lr.to);
  }

  function runReport() {
    const input: SalesReportInput = {
      dateRange: { from: dateFrom, to: dateTo },
      categories,
      viewMode,
      ...(paymentFilter !== "ALL" ? { paymentMethods: [paymentFilter] } : {}),
      ...(comparative
        ? { compareDateRange: { from: compareFrom, to: compareTo } }
        : {}),
    };
    startTransition(async () => {
      const result = await getSalesReport(input);
      setData(result);
    });
  }

  function DeltaIndicator({
    a,
    b,
    format = "currency",
  }: {
    a: number;
    b: number;
    format?: "currency" | "number" | "percent";
  }) {
    if (b === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const delta = a - b;
    const pctChange = ((delta / b) * 100).toFixed(1);
    const isUp = delta > 0;
    const Icon = isUp ? ArrowUpRight : ArrowDownRight;
    const color = isUp ? "text-green-600" : "text-red-600";
    const formatted =
      format === "currency"
        ? fmt(Math.abs(delta))
        : format === "percent"
          ? pct(Math.abs(delta))
          : Math.abs(delta).toFixed(0);

    return (
      <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {formatted} ({pctChange}%)
      </span>
    );
  }

  const paymentMethods = [
    "ALL",
    "CASH",
    "CARD",
    "YAPPY",
    "BANK_TRANSFER",
    "GIFT_CARD",
    "LOYALTY",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("salesReport")}
        description={t("salesReportDesc")}
        backHref={`/app/${slug}/reports`}
      >
        {data && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            {t("print")}
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>{t("dateFrom")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("dateTo")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("viewMode")}</Label>
              <Select
                value={viewMode}
                onValueChange={(v) => setViewMode(v as "summary" | "detailed")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {viewMode === "summary" ? t("summary") : t("detailed")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">{t("summary")}</SelectItem>
                  <SelectItem value="detailed">{t("detailed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("paymentMethod")}</Label>
              <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v ?? "ALL")}>
                <SelectTrigger>
                  <SelectValue>
                    {paymentFilter === "ALL"
                      ? ct("all")
                      : t(`pm_${paymentFilter}`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm} value={pm}>
                      {pm === "ALL" ? ct("all") : t(`pm_${pm}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category checkboxes */}
          <div className="flex flex-wrap gap-4">
            <Label className="text-sm font-medium">{t("categories")}:</Label>
            {(["CLINIC", "GROOMING", "PRODUCT"] as const).map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={categories.includes(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                {t(`cat_${cat}`)}
              </label>
            ))}
          </div>

          {/* Comparative toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={comparative}
              onCheckedChange={setComparative}
            />
            <Label>{t("comparativeReport")}</Label>
          </div>

          {comparative && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pl-6 border-l-2 border-muted">
              <div>
                <Label>{t("compareDateFrom")}</Label>
                <Input
                  type="date"
                  value={compareFrom}
                  onChange={(e) => setCompareFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("compareDateTo")}</Label>
                <Input
                  type="date"
                  value={compareTo}
                  onChange={(e) => setCompareTo(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button onClick={runReport} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("generateReport")}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {data && (
        <div className="space-y-6 print:space-y-4">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t("totalRevenue")}
              value={fmt(data.periodA.totalRevenue)}
              compare={
                data.periodB ? (
                  <DeltaIndicator
                    a={data.periodA.totalRevenue}
                    b={data.periodB.totalRevenue}
                  />
                ) : undefined
              }
            />
            <KpiCard
              label={t("transactions")}
              value={data.periodA.txCount.toString()}
              compare={
                data.periodB ? (
                  <DeltaIndicator
                    a={data.periodA.txCount}
                    b={data.periodB.txCount}
                    format="number"
                  />
                ) : undefined
              }
            />
            <KpiCard
              label={t("avgTicket")}
              value={fmt(data.periodA.avgTicket)}
              compare={
                data.periodB ? (
                  <DeltaIndicator
                    a={data.periodA.avgTicket}
                    b={data.periodB.avgTicket}
                  />
                ) : undefined
              }
            />
            <KpiCard
              label={t("totalTax")}
              value={fmt(data.periodA.totalTax)}
              compare={
                data.periodB ? (
                  <DeltaIndicator
                    a={data.periodA.totalTax}
                    b={data.periodB.totalTax}
                  />
                ) : undefined
              }
            />
          </div>

          {/* Payment Method Breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("paymentBreakdown")}
              </h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(data.periodA.byPaymentMethod).map(
                  ([method, amount]) => (
                    <div
                      key={method}
                      className="flex justify-between items-center p-2 bg-muted/50 rounded"
                    >
                      <span className="text-sm">{t(`pm_${method}`)}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {fmt(amount)}
                        </span>
                        {data.periodB?.byPaymentMethod[method] !==
                          undefined && (
                          <div>
                            <DeltaIndicator
                              a={amount}
                              b={data.periodB.byPaymentMethod[method]}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("categoryBreakdown")}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead className="text-right">
                      {t("itemsSold")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("revenue")}
                    </TableHead>
                    {data.periodB && (
                      <>
                        <TableHead className="text-right">
                          {t("periodBRevenue")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("change")}
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.periodA.byCategory).map(
                    ([cat, vals]) => (
                      <TableRow key={cat}>
                        <TableCell>
                          <Badge variant="outline">{t(`cat_${cat}`)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {vals.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(vals.revenue)}
                        </TableCell>
                        {data.periodB && (
                          <>
                            <TableCell className="text-right">
                              {fmt(
                                data.periodB.byCategory[cat]?.revenue ?? 0
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DeltaIndicator
                                a={vals.revenue}
                                b={
                                  data.periodB.byCategory[cat]?.revenue ?? 0
                                }
                              />
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Daily Summary */}
          {viewMode === "summary" && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {t("dailySummary")}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ct("date")}</TableHead>
                      <TableHead className="text-right">
                        {t("transactions")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("revenue")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.periodA.dailyTotals)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([day, vals]) => (
                        <TableRow key={day}>
                          <TableCell>{day}</TableCell>
                          <TableCell className="text-right">
                            {vals.txCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmt(vals.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Detailed Transaction List */}
          {viewMode === "detailed" && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {t("transactionList")}
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{ct("date")}</TableHead>
                        <TableHead>{t("customer")}</TableHead>
                        <TableHead className="text-right">
                          {ct("subtotal")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("tax")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("discount")}
                        </TableHead>
                        <TableHead className="text-right">
                          {ct("total")}
                        </TableHead>
                        <TableHead>{t("paymentMethod")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.periodA.sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-xs">
                            {sale.saleNumber}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {sale.customer ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmt(sale.subtotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmt(sale.itbms)}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.discount > 0
                              ? fmt(sale.discount)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(sale.total)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sale.payments.map((p, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {t(`pm_${p.method}`)} {fmt(p.amount)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  compare,
}: {
  label: string;
  value: string;
  compare?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {compare && <div className="mt-1">{compare}</div>}
      </CardContent>
    </Card>
  );
}
