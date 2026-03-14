import Link from "next/link";
import { Plus, Dog } from "lucide-react";
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
import { getPets } from "./actions";

const speciesLabel: Record<string, string> = {
  DOG: "Perro",
  CAT: "Gato",
  BIRD: "Ave",
  REPTILE: "Reptil",
  RODENT: "Roedor",
  OTHER: "Otro",
};

const sexLabel: Record<string, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
  UNKNOWN: "—",
};

export default async function PetsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;
  const { pets, total, totalPages } = await getPets(search, page);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mascotas"
        description={`${total} mascota${total !== 1 ? "s" : ""} registrada${total !== 1 ? "s" : ""}`}
      >
        <Link href="/dashboard/pets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Mascota
          </Button>
        </Link>
      </PageHeader>

      <SearchInput placeholder="Buscar por nombre, raza, dueño o microchip..." />

      {pets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Dog className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No se encontraron mascotas" : "No hay mascotas registradas"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search
              ? "Intenta con otro término de búsqueda"
              : "Haz clic en \"Nueva Mascota\" para comenzar"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especie</TableHead>
                  <TableHead>Raza</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Dueño</TableHead>
                  <TableHead>Registrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.map((pet) => (
                  <TableRow key={pet.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/pets/${pet.id}`}
                        className="font-medium hover:underline"
                      >
                        {pet.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {speciesLabel[pet.species] ?? pet.species}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pet.breed || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sexLabel[pet.sex] ?? pet.sex}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/owners/${pet.ownerId}`}
                        className="text-sm hover:underline"
                      >
                        {pet.owner.firstName} {pet.owner.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(pet.createdAt).toLocaleDateString("es-PA", {
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
