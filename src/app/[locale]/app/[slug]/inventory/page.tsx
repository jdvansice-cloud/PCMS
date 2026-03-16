import Link from "next/link";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { formatCurrency } from "@/lib/utils";
import { getProducts } from "./actions";

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: "bg-amber-100 text-amber-800",
  MEDICATION: "bg-red-100 text-red-800",
  SUPPLEMENT: "bg-green-100 text-green-800",
  ACCESSORY: "bg-blue-100 text-blue-800",
  TOY: "bg-pink-100 text-pink-800",
  HYGIENE: "bg-cyan-100 text-cyan-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export default async function InventoryPage({
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
  const t = await getTranslations("inventory");
  const tc = await getTranslations("common");

  const { products, totalPages } = await getProducts(search, page);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")}>
        <Link href={`/app/${slug}/inventory/new`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newProduct")}
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder={t("searchPlaceholder")} />

      {products.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("noProducts")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {products.map((p) => (
              <Link key={p.id} href={`/app/${slug}/inventory/${p.id}`}>
                <Card className="shadow-sm border-0 shadow-black/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`text-xs ${CATEGORY_COLORS[p.category] ?? ""}`}>
                            {p.category}
                          </Badge>
                          {p.stock <= p.minStock && (
                            <span className="text-xs text-destructive flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              {p.stock === 0 ? t("outOfStock") : t("lowStock")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(Number(p.price))}</p>
                        <p className="text-xs text-muted-foreground">{t("stock")}: {p.stock}</p>
                      </div>
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
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("sku")}</TableHead>
                  <TableHead>{tc("price")}</TableHead>
                  <TableHead>{t("stock")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("cost")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/app/${slug}/inventory/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${CATEGORY_COLORS[p.category] ?? ""}`}>
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.sku || "—"}</TableCell>
                    <TableCell>{formatCurrency(Number(p.price))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {p.stock}
                        {p.stock <= p.minStock && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {p.cost ? formatCurrency(Number(p.cost)) : "—"}
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
