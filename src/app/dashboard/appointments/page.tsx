import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { getAppointments } from "./actions";

const typeLabel: Record<string, string> = {
  CONSULTATION: "Consulta", VACCINATION: "Vacunación", SURGERY: "Cirugía",
  GROOMING: "Peluquería", FOLLOW_UP: "Seguimiento", EMERGENCY: "Emergencia", OTHER: "Otro",
};

const statusLabel: Record<string, string> = {
  SCHEDULED: "Programada", CONFIRMED: "Confirmada", IN_PROGRESS: "En Progreso",
  COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No Asistió",
};

const statusColor: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; date?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;
  const date = params.date ?? "";
  const { appointments, total, totalPages } = await getAppointments(search, page, date || undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        description={`${total} cita${total !== 1 ? "s" : ""}`}
      >
        <Link href="/dashboard/appointments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </Link>
      </PageHeader>

      <div className="flex gap-4 items-end flex-wrap">
        <SearchInput placeholder="Buscar por mascota, cliente o motivo..." />
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search || date ? "No se encontraron citas" : "No hay citas registradas"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {search || date ? "Intenta con otro filtro" : "Haz clic en \"Nueva Cita\" para comenzar"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Mascota</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Veterinario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>
                      <Link href={`/dashboard/appointments/${apt.id}`} className="font-medium hover:underline">
                        {new Date(apt.scheduledAt).toLocaleDateString("es-PA", { day: "2-digit", month: "short" })}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.scheduledAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}{apt.durationMin} min
                      </p>
                    </TableCell>
                    <TableCell className="font-medium">{apt.pet.name}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/owners/${apt.ownerId}`} className="text-sm hover:underline">
                        {apt.owner.firstName} {apt.owner.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabel[apt.type] ?? apt.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[apt.status] ?? ""}`}>
                        {statusLabel[apt.status] ?? apt.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {apt.vet ? `${apt.vet.firstName} ${apt.vet.lastName}` : "—"}
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
                  <Link href={`?${new URLSearchParams({ ...(search ? { search } : {}), ...(date ? { date } : {}), page: String(page - 1) }).toString()}`}>
                    <Button variant="outline" size="sm">Anterior</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`?${new URLSearchParams({ ...(search ? { search } : {}), ...(date ? { date } : {}), page: String(page + 1) }).toString()}`}>
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
