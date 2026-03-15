import Link from "next/link";
import { ArrowLeft, ShoppingCart, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { getSales } from "../actions";
import { formatCurrency } from "@/lib/utils";

const paymentLabel: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  YAPPY: "Yappy",
  BANK_TRANSFER: "Transferencia",
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;
  const { sales, total, totalPages } = await getSales(search, page);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader
          title="Historial de Ventas"
          description={`${total} venta${total !== 1 ? "s" : ""}`}
        >
          <Link href="/dashboard/pos">
            <Button className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Nueva Venta
            </Button>
          </Link>
        </PageHeader>
      </div>

      <SearchInput placeholder="Buscar por cliente o número de venta..." />

      {sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No se encontraron ventas" : "No hay ventas registradas"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search ? "Intenta con otro filtro" : "Realiza una venta desde el Punto de Venta"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Link href={`/dashboard/pos/sales/${sale.id}`} className="font-medium hover:underline">
                        #{sale.saleNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{new Date(sale.createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}</p>
                    </TableCell>
                    <TableCell>
                      {sale.owner ? (
                        <Link href={`/dashboard/owners/${sale.owner.id}`} className="text-sm hover:underline">
                          {sale.owner.firstName} {sale.owner.lastName}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sale._count.lines}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(sale.total))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page - 1) }).toString()}`}>
                    <Button variant="outline" size="sm">Anterior</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`?${new URLSearchParams({ ...(search ? { search } : {}), page: String(page + 1) }).toString()}`}>
                    <Button variant="outline" size="sm">Siguiente</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
