"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getClinicReport } from "../actions";
import { Loader2, Printer } from "lucide-react";

type Props = {
  slug: string;
  vets: { id: string; firstName: string; lastName: string }[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type ClinicData = Awaited<ReturnType<typeof getClinicReport>>;

export function ClinicReport({ slug, vets }: Props) {
  const t = useTranslations("reports");
  const ct = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<ClinicData | null>(null);
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [vetId, setVetId] = useState("ALL");
  const [view, setView] = useState<"throughput" | "by-type" | "no-shows">(
    "throughput"
  );

  function runReport() {
    startTransition(async () => {
      const result = await getClinicReport({
        dateRange: { from: dateFrom, to: dateTo },
        view,
        ...(vetId !== "ALL" ? { vetId } : {}),
      });
      setData(result);
    });
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    COMPLETED: "default",
    SCHEDULED: "secondary",
    CONFIRMED: "secondary",
    IN_PROGRESS: "outline",
    CANCELLED: "destructive",
    NO_SHOW: "destructive",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("clinicReport")}
        description={t("clinicReportDesc")}
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
            <div>
              <Label>{t("veterinarian")}</Label>
              <Select value={vetId} onValueChange={(v) => setVetId(v ?? "ALL")}>
                <SelectTrigger>
                  <SelectValue>
                    {vetId === "ALL"
                      ? ct("all")
                      : vets.find((v) => v.id === vetId)
                        ? `${vets.find((v) => v.id === vetId)!.firstName} ${vets.find((v) => v.id === vetId)!.lastName}`
                        : ct("all")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{ct("all")}</SelectItem>
                  {vets.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.firstName} {v.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("viewMode")}</Label>
              <Select
                value={view}
                onValueChange={(v) =>
                  setView(v as "throughput" | "by-type" | "no-shows")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {view === "throughput"
                      ? t("throughput")
                      : view === "by-type"
                        ? t("byType")
                        : t("noShows")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="throughput">
                    {t("throughput")}
                  </SelectItem>
                  <SelectItem value="by-type">{t("byType")}</SelectItem>
                  <SelectItem value="no-shows">{t("noShows")}</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label={t("totalAppointments")}
              value={data.total.toString()}
            />
            <KpiCard
              label={t("completed")}
              value={data.completed.toString()}
            />
            <KpiCard
              label={t("noShowCount")}
              value={data.noShows.toString()}
            />
            <KpiCard
              label={t("noShowRate")}
              value={`${data.noShowRate.toFixed(1)}%`}
            />
            <KpiCard
              label={t("avgDuration")}
              value={`${data.avgDuration.toFixed(0)} min`}
            />
          </div>

          {/* By Status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("byStatus")}
              </h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                  >
                    <Badge variant={statusColors[status] ?? "outline"}>
                      {t(`status_${status}`)}
                    </Badge>
                    <span className="font-medium text-sm">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Type */}
          {Object.keys(data.byType).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {t("byAppointmentType")}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("appointmentType")}</TableHead>
                      <TableHead className="text-right">
                        {t("count")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.byType)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <TableRow key={type}>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`aptType_${type}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {count}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* By Vet */}
          {data.byVet.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {t("byVeterinarian")}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("veterinarian")}</TableHead>
                      <TableHead className="text-right">
                        {t("appointments")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byVet.map((v) => (
                      <TableRow key={v.name}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell className="text-right">
                          {v.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Daily throughput */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("dailyThroughput")}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ct("date")}</TableHead>
                    <TableHead className="text-right">
                      {t("appointments")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.dailyCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([day, count]) => (
                      <TableRow key={day}>
                        <TableCell>{day}</TableCell>
                        <TableCell className="text-right">{count}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Appointment detail list */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("appointmentList")}
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ct("date")}</TableHead>
                      <TableHead>{t("service")}</TableHead>
                      <TableHead>{t("pet")}</TableHead>
                      <TableHead>{t("veterinarian")}</TableHead>
                      <TableHead>{ct("status")}</TableHead>
                      <TableHead>{t("duration")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.appointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">
                          {new Date(a.scheduledAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{a.service ?? "—"}</TableCell>
                        <TableCell>{a.pet ?? "—"}</TableCell>
                        <TableCell>{a.vet ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={statusColors[a.status] ?? "outline"}
                            className="text-xs"
                          >
                            {t(`status_${a.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {a.duration ? `${a.duration} min` : "—"}
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
