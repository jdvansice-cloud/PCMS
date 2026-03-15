import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { getServices } from "./actions";
import { formatCurrency } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  CONSULTATION: "bg-blue-100 text-blue-800",
  VACCINATION: "bg-green-100 text-green-800",
  SURGERY: "bg-red-100 text-red-800",
  GROOMING: "bg-pink-100 text-pink-800",
  FOLLOW_UP: "bg-yellow-100 text-yellow-800",
  EMERGENCY: "bg-orange-100 text-orange-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export default async function ServicesPage({
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
  const t = await getTranslations("services");

  const { services, totalPages } = await getServices(search, page);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")}>
        <Link href={`/app/${slug}/services/new`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newService")}
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder={t("searchPlaceholder")} />

      {services.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("noServices")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {services.map((s) => (
              <Link key={s.id} href={`/app/${slug}/services/${s.id}`}>
                <Card className="shadow-sm border-0 shadow-black/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.durationMin} min</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(Number(s.price))}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="shadow-sm border-0 shadow-black/5 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="hidden md:table-cell">{t("duration")}</TableHead>
                  <TableHead className="hidden lg:table-cell">ITBMS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/app/${slug}/services/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${TYPE_COLORS[s.type] ?? ""}`}>{s.type}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(s.price))}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.durationMin} min</TableCell>
                    <TableCell className="hidden lg:table-cell">{s.isTaxExempt ? "Exento" : "7%"}</TableCell>
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
