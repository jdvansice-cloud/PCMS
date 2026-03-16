import Link from "next/link";
import { Plus, Dog } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { getPets } from "./actions";

const SPECIES_COLORS: Record<string, string> = {
  DOG: "bg-amber-100 text-amber-800",
  CAT: "bg-purple-100 text-purple-800",
  BIRD: "bg-sky-100 text-sky-800",
  REPTILE: "bg-green-100 text-green-800",
  RODENT: "bg-orange-100 text-orange-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export default async function PetsPage({
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
  const t = await getTranslations("pets");
  const tc = await getTranslations("common");

  const { pets, totalPages } = await getPets(search, page);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")}>
        <Link href={`/app/${slug}/pets/new`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("newPet")}
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder={t("searchPlaceholder")} />

      {pets.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Dog className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("noPets")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {pets.map((p) => (
              <Link key={p.id} href={`/app/${slug}/pets/${p.id}`}>
                <Card className="shadow-sm border-0 shadow-black/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.owner.firstName} {p.owner.lastName}</p>
                      </div>
                      <Badge className={`text-xs ${SPECIES_COLORS[p.species] ?? ""}`}>{p.species}</Badge>
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
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{t("species")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("breed")}</TableHead>
                  <TableHead>{t("owner")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("sex")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/app/${slug}/pets/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${SPECIES_COLORS[p.species] ?? ""}`}>{p.species}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{p.breed || "\u2014"}</TableCell>
                    <TableCell>{p.owner.firstName} {p.owner.lastName}</TableCell>
                    <TableCell className="hidden lg:table-cell">{p.sex}</TableCell>
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
