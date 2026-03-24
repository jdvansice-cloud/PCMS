"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCustomerReport } from "../actions";
import { Loader2, Printer } from "lucide-react";

type Props = { slug: string };

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type CustomerData = Awaited<ReturnType<typeof getCustomerReport>>;

// Discriminated types for each view
type AcquisitionData = Extract<CustomerData, { totalNew: number }>;
type RetentionData = Extract<CustomerData, { retentionRate: number }>;
type TopData = Extract<CustomerData, { topCustomers: any[] }>;

export function CustomersReport({ slug }: Props) {
  const t = useTranslations("reports");
  const ct = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<CustomerData | null>(null);
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [view, setView] = useState<"acquisition" | "retention" | "top">(
    "acquisition"
  );

  function runReport() {
    startTransition(async () => {
      const result = await getCustomerReport({
        dateRange: { from: dateFrom, to: dateTo },
        view,
      });
      setData(result);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("customersReport")}
        description={t("customersReportDesc")}
        backHref={`/app/${slug}/reports`}
      >
        {data && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            {t("print")}
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>{t("dateFrom")}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("dateTo")}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Tabs
            value={view}
            onValueChange={(v) => setView(v as typeof view)}
          >
            <TabsList>
              <TabsTrigger value="acquisition">
                {t("acquisition")}
              </TabsTrigger>
              <TabsTrigger value="retention">{t("retention")}</TabsTrigger>
              <TabsTrigger value="top">{t("topCustomers")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={runReport} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("generateReport")}
          </Button>
        </CardContent>
      </Card>

      {data && (
        <div className="space-y-6 print:space-y-4">
          {/* Acquisition View */}
          {"totalNew" in data && (() => {
            const d = data as AcquisitionData;
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <KpiCard
                    label={t("newCustomers")}
                    value={d.totalNew.toString()}
                  />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3">
                      {t("dailyAcquisition")}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ct("date")}</TableHead>
                          <TableHead className="text-right">
                            {t("newCustomers")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(d.dailyCounts)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([day, count]) => (
                            <TableRow key={day}>
                              <TableCell>{day}</TableCell>
                              <TableCell className="text-right">
                                {count}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3">
                      {t("customerList")}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ct("name")}</TableHead>
                          <TableHead>{t("firstVisit")}</TableHead>
                          <TableHead className="text-right">
                            {t("totalSales")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("totalAppointments")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.customers.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>
                              {new Date(
                                c.firstVisitAt
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.totalSales}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.totalAppointments}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

          {/* Retention View */}
          {"retentionRate" in data && (() => {
            const d = data as RetentionData;
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-4">
                  <KpiCard
                    label={t("totalCustomers")}
                    value={d.totalCustomers.toString()}
                  />
                  <KpiCard
                    label={t("returningCustomers")}
                    value={d.returningCount.toString()}
                  />
                  <KpiCard
                    label={t("oneTimeCustomers")}
                    value={d.oneTimeCount.toString()}
                  />
                  <KpiCard
                    label={t("retentionRate")}
                    value={`${d.retentionRate.toFixed(1)}%`}
                  />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3">
                      {t("customerList")}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ct("name")}</TableHead>
                          <TableHead className="text-right">
                            {t("visits")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("purchases")}
                          </TableHead>
                          <TableHead>{ct("status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.customers.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell className="text-right">
                              {c.visitCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.salesCount}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  c.isReturning ? "default" : "secondary"
                                }
                              >
                                {c.isReturning
                                  ? t("returning")
                                  : t("oneTime")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

          {/* Top Customers View */}
          {"topCustomers" in data && (() => {
            const d = data as TopData;
            return (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3">
                    {t("topCustomers")}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{ct("name")}</TableHead>
                        <TableHead className="text-right">
                          {t("transactions")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("revenue")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.topCustomers.map((c, i) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono">
                            {i + 1}
                          </TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell className="text-right">
                            {c.txCount}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(c.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
