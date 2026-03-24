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
import { getGroomingReport } from "../actions";
import { Loader2, Printer } from "lucide-react";

type Props = {
  slug: string;
  groomers: { id: string; firstName: string; lastName: string }[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type GroomingData = Awaited<ReturnType<typeof getGroomingReport>>;

export function GroomingReport({ slug, groomers }: Props) {
  const t = useTranslations("reports");
  const ct = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<GroomingData | null>(null);
  const [dateFrom, setDateFrom] = useState(startOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [groomerId, setGroomerId] = useState("ALL");

  function runReport() {
    startTransition(async () => {
      const result = await getGroomingReport({
        dateRange: { from: dateFrom, to: dateTo },
        view: "throughput",
        ...(groomerId !== "ALL" ? { groomerId } : {}),
      });
      setData(result);
    });
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    COMPLETED: "default",
    PENDING: "secondary",
    IN_PROGRESS: "outline",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("groomingReport")}
        description={t("groomingReportDesc")}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <Label>{t("groomer")}</Label>
              <Select value={groomerId} onValueChange={(v) => setGroomerId(v ?? "ALL")}>
                <SelectTrigger>
                  <SelectValue>
                    {groomerId === "ALL"
                      ? ct("all")
                      : groomers.find((g) => g.id === groomerId)
                        ? `${groomers.find((g) => g.id === groomerId)!.firstName} ${groomers.find((g) => g.id === groomerId)!.lastName}`
                        : ct("all")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{ct("all")}</SelectItem>
                  {groomers.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.firstName} {g.lastName}
                    </SelectItem>
                  ))}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t("totalSessions")}
              value={data.total.toString()}
            />
            <KpiCard
              label={t("completed")}
              value={data.completed.toString()}
            />
            <KpiCard
              label={t("avgGroomingTime")}
              value={`${data.avgDurationMin.toFixed(0)} min`}
            />
            <KpiCard
              label={t("completionRate")}
              value={`${data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0}%`}
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
                      {t(`gStatus_${status}`)}
                    </Badge>
                    <span className="font-medium text-sm">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Pet Size */}
          {Object.keys(data.bySize).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {t("byPetSize")}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.bySize).map(([size, count]) => (
                    <div
                      key={size}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                    >
                      <Badge variant="outline">{size}</Badge>
                      <span className="font-medium text-sm">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Groomer */}
          {data.byGroomer.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {t("byGroomer")}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("groomer")}</TableHead>
                      <TableHead className="text-right">
                        {t("sessions")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("avgTime")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byGroomer.map((g) => (
                      <TableRow key={g.name}>
                        <TableCell>{g.name}</TableCell>
                        <TableCell className="text-right">
                          {g.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {g.avgMin.toFixed(0)} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Daily Throughput */}
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
                      {t("sessions")}
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

          {/* Session detail list */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("sessionList")}
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ct("date")}</TableHead>
                      <TableHead>{t("pet")}</TableHead>
                      <TableHead>{t("breed")}</TableHead>
                      <TableHead>{t("size")}</TableHead>
                      <TableHead>{t("groomer")}</TableHead>
                      <TableHead>{ct("status")}</TableHead>
                      <TableHead>{t("duration")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sessions.map((s) => {
                      const duration =
                        s.startedAt && s.completedAt
                          ? Math.round(
                              (new Date(s.completedAt).getTime() -
                                new Date(s.startedAt).getTime()) /
                                60000
                            )
                          : null;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">
                            {new Date(s.scheduledAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{s.pet ?? "—"}</TableCell>
                          <TableCell>{s.breed ?? "—"}</TableCell>
                          <TableCell>{s.petSize ?? "—"}</TableCell>
                          <TableCell>{s.groomer ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={statusColors[s.status] ?? "outline"}
                              className="text-xs"
                            >
                              {t(`gStatus_${s.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {duration ? `${duration} min` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
