import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { formatCurrency } from "@/lib/utils";
import { getSales } from "../actions";

export default async function SalesPage({
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
  const t = await getTranslations("pos");
  const base = `/app/${slug}/pos`;

  const { sales, totalPages } = await getSales(search, page);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("salesHistory")}>
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al POS
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder="Buscar por # de venta o cliente..." />

      {sales.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("noSales")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {sales.map((s) => (
              <Link key={s.id} href={`${base}/sales/${s.id}`}>
                <Card className="shadow-sm border-0 shadow-black/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">#{s.saleNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.owner ? `${s.owner.firstName} ${s.owner.lastName}` : "Sin cliente"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(Number(s.total))}</span>
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
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`${base}/sales/${s.id}`} className="font-medium hover:underline">
                        #{s.saleNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {s.owner ? `${s.owner.firstName} ${s.owner.lastName}` : "—"}
                    </TableCell>
                    <TableCell>{s._count.lines}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(s.total))}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(s.createdAt).toLocaleDateString("es-PA")}
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
