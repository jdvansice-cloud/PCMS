"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getKennelReport } from "../actions";
import { Loader2, Printer } from "lucide-react";

type Props = { slug: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type KennelData = Awaited<ReturnType<typeof getKennelReport>>;

export function KennelsReport({ slug }: Props) {
  const t = useTranslations("reports");
  const ct = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<KennelData | null>(null);
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());

  function runReport() {
    startTransition(async () => {
      const result = await getKennelReport({
        dateRange: { from: dateFrom, to: dateTo },
        view: "occupancy",
      });
      setData(result);
    });
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    DISCHARGED: "secondary",
    TRANSFERRED: "outline",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("kennelsReport")}
        description={t("kennelsReportDesc")}
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
          <div className="grid gap-4 sm:grid-cols-2">
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

          <Button onClick={runReport} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {t("generateReport")}
          </Button>
        </CardContent>
      </Card>

      {data && (
        <div className="space-y-6 print:space-y-4">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t("totalKennels")}
              value={data.totalKennels.toString()}
            />
            <KpiCard
              label={t("totalStays")}
              value={data.totalStays.toString()}
            />
            <KpiCard
              label={t("occupancyRate")}
              value={`${data.occupancyRate.toFixed(1)}%`}
            />
            <KpiCard
              label={t("avgStayDuration")}
              value={`${data.avgStayDuration.toFixed(1)} ${t("days")}`}
            />
          </div>

          {/* By Kennel */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("byKennel")}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("kennel")}</TableHead>
                    <TableHead className="text-right">
                      {t("stays")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("occupiedDays")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("utilizationRate")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byKennel.map((k) => {
                    const totalDays = data.totalKennelDays / data.totalKennels;
                    const util =
                      totalDays > 0
                        ? (k.occupiedDays / totalDays) * 100
                        : 0;
                    return (
                      <TableRow key={k.name}>
                        <TableCell>{k.name}</TableCell>
                        <TableCell className="text-right">
                          {k.stayCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {k.occupiedDays}
                        </TableCell>
                        <TableCell className="text-right">
                          {util.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Stay details */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("stayList")}
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("kennel")}</TableHead>
                      <TableHead>{t("pet")}</TableHead>
                      <TableHead>{t("species")}</TableHead>
                      <TableHead>{t("admitted")}</TableHead>
                      <TableHead>{t("discharged")}</TableHead>
                      <TableHead>{ct("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.stays.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.kennelName}</TableCell>
                        <TableCell>{s.petName ?? "—"}</TableCell>
                        <TableCell>{s.species ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(s.admittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.dischargedAt
                            ? new Date(s.dischargedAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusColors[s.status] ?? "outline"}
                            className="text-xs"
                          >
                            {t(`stayStatus_${s.status}`)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
