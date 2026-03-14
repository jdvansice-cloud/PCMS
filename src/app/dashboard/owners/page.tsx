import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { getOwners } from "./actions";

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;
  const { owners, total, totalPages } = await getOwners(search, page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${total} cliente${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}`}
      >
        <Link href="/dashboard/owners/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder="Buscar por nombre, cédula, teléfono o email..." />

      {owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No se encontraron clientes" : "No hay clientes registrados"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search
              ? "Intenta con otro término de búsqueda"
              : "Haz clic en \"Nuevo Cliente\" para comenzar"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Mascotas</TableHead>
                  <TableHead>Registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/owners/${owner.id}`}
                        className="font-medium hover:underline"
                      >
                        {owner.firstName} {owner.lastName}
                      </Link>
                      {owner.cedula && (
                        <p className="text-xs text-muted-foreground">
                          {owner.cedula}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {owner.phone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {owner.email || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {owner._count.pets}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(owner.createdAt).toLocaleDateString("es-PA", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?${new URLSearchParams({
                      ...(search ? { search } : {}),
                      page: String(page - 1),
                    }).toString()}`}
                  >
                    <Button variant="outline" size="sm">
                      Anterior
                    </Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`?${new URLSearchParams({
                      ...(search ? { search } : {}),
                      page: String(page + 1),
                    }).toString()}`}
                  >
                    <Button variant="outline" size="sm">
                      Siguiente
                    </Button>
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
