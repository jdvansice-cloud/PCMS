import Link from "next/link";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { getProducts } from "./actions";
import { formatCurrency } from "@/lib/utils";

const categoryLabel: Record<string, string> = {
  FOOD: "Alimento", MEDICATION: "Medicamento", SUPPLEMENT: "Suplemento",
  ACCESSORY: "Accesorio", TOY: "Juguete", HYGIENE: "Higiene", OTHER: "Otro",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;
  const { products, total, totalPages } = await getProducts(search, page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description={`${total} producto${total !== 1 ? "s" : ""}`}
      >
        <Link href="/dashboard/inventory/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder="Buscar por nombre, SKU o código de barras..." />

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No se encontraron productos" : "No hay productos registrados"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search ? "Intenta con otro término" : "Haz clic en \"Nuevo Producto\" para comenzar"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const lowStock = product.stock <= product.minStock && product.minStock > 0;
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link href={`/dashboard/inventory/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabel[product.category] ?? product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={lowStock ? "text-destructive font-medium" : ""}>
                          {product.stock}
                        </span>
                        {lowStock && <AlertTriangle className="inline ml-1 h-3.5 w-3.5 text-destructive" />}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(product.price))}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
