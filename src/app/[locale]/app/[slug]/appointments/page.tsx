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

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  NO_SHOW: "bg-red-100 text-red-800",
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

  const { appointments, totalPages } = await getAppointments(search, page, sp.status);

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString("es-PA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <Card className="shadow-sm border-0 shadow-black/5">
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
                <Card className="shadow-sm border-0 shadow-black/5">
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
          <Card className="shadow-sm border-0 shadow-black/5 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("scheduledAt")}</TableHead>
                  <TableHead>{t("pet")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("vet")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("type")}</TableHead>
                  <TableHead>Estado</TableHead>
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
