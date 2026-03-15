import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { getOwners } from "./actions";

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = Number(sp.page) || 1;
  const t = await getTranslations("clients");

  const { owners, totalPages } = await getOwners(search, page);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")}>
        <Link href={`/app/${slug}/clients/new`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newClient")}
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder={t("searchPlaceholder")} />

      {owners.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("noClients")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("noClientsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {owners.map((o) => (
              <Link key={o.id} href={`/app/${slug}/clients/${o.id}`}>
                <Card className="shadow-sm border-0 shadow-black/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{o.firstName} {o.lastName}</p>
                        <p className="text-xs text-muted-foreground">{o.phone || o.email || "—"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{o._count.pets} mascotas</span>
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
                  <TableHead>{t("firstName")}</TableHead>
                  <TableHead>{t("lastName")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("cedula")}</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="text-center">{t("petsCount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/app/${slug}/clients/${o.id}`} className="font-medium hover:underline">
                        {o.firstName}
                      </Link>
                    </TableCell>
                    <TableCell>{o.lastName}</TableCell>
                    <TableCell className="hidden md:table-cell">{o.cedula || "—"}</TableCell>
                    <TableCell>{o.phone || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{o.email || "—"}</TableCell>
                    <TableCell className="text-center">{o._count.pets}</TableCell>
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
