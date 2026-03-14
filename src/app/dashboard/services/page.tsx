import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { getServices } from "./actions";
import { formatCurrency } from "@/lib/utils";

const typeLabel: Record<string, string> = {
  CONSULTATION: "Consulta",
  VACCINATION: "Vacunación",
  SURGERY: "Cirugía",
  GROOMING: "Peluquería",
  FOLLOW_UP: "Seguimiento",
  EMERGENCY: "Emergencia",
  OTHER: "Otro",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;
  const { services, total, totalPages } = await getServices(search, page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios"
        description={`${total} servicio${total !== 1 ? "s" : ""}`}
      >
        <Link href="/dashboard/services/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder="Buscar por nombre o descripción..." />

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No se encontraron servicios" : "No hay servicios registrados"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search ? "Intenta con otro término" : "Haz clic en \"Nuevo Servicio\" para comenzar"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <Link href={`/dashboard/services/${service.id}`} className="font-medium hover:underline">
                        {service.name}
                      </Link>
                      {service.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{service.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabel[service.type] ?? service.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{service.durationMin} min</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(service.price))}
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
