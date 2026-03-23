import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { getAppointments } from "./actions";
import { getOrgDateSettings, formatDateTimeServer } from "@/lib/format-date";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-[var(--status-scheduled)]/10 text-[var(--status-scheduled)]",
  CONFIRMED: "bg-[var(--status-confirmed)]/10 text-[var(--status-confirmed)]",
  IN_PROGRESS: "bg-[var(--status-in-progress)]/10 text-[var(--status-in-progress)]",
  COMPLETED: "bg-[var(--status-completed)]/10 text-[var(--status-completed)]",
  CANCELLED: "bg-[var(--status-cancelled)]/10 text-[var(--status-cancelled)]",
  NO_SHOW: "bg-[var(--status-no-show)]/10 text-[var(--status-no-show)]",
};

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = Number(sp.page) || 1;
  const t = await getTranslations("appointments");
  const tc = await getTranslations("common");

  const [{ appointments, totalPages }, orgDate] = await Promise.all([
    getAppointments(search, page, sp.status),
    getOrgDateSettings(),
  ]);

  function formatDate(d: Date) {
    return formatDateTimeServer(d, orgDate.timezone, orgDate.locale);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")}>
        <Link href={`/app/${slug}/appointments/new`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newAppointment")}
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder={t("searchPlaceholder")} />

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("noAppointments")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {appointments.map((a) => (
              <Link key={a.id} href={`/app/${slug}/appointments/${a.id}`}>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{a.pet.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.owner.firstName} {a.owner.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(a.scheduledAt)}
                        </p>
                      </div>
                      <Badge className={`text-xs ${STATUS_COLORS[a.status] ?? ""}`}>
                        {a.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("scheduledAt")}</TableHead>
                  <TableHead>{t("pet")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("vet")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("type")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/app/${slug}/appointments/${a.id}`} className="font-medium hover:underline">
                        {formatDate(a.scheduledAt)}
                      </Link>
                    </TableCell>
                    <TableCell>{a.pet.name}</TableCell>
                    <TableCell>{a.owner.firstName} {a.owner.lastName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {a.vet ? `${a.vet.firstName} ${a.vet.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{a.type}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[a.status] ?? ""}`}>
                        {a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Pagination totalPages={totalPages} currentPage={page} />
        </>
      )}
    </div>
  );
}
