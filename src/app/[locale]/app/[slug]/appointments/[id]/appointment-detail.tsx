"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateAppointmentStatus, deleteAppointment } from "../actions";
import type { AppointmentStatus } from "@/generated/prisma/client";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  NO_SHOW: "bg-red-100 text-red-800",
};

type Appointment = {
  id: string;
  type: string;
  status: string;
  scheduledAt: Date;
  durationMin: number;
  reason: string | null;
  notes: string | null;
  owner: { id: string; firstName: string; lastName: string; phone: string | null };
  pet: { id: string; name: string; species: string; breed: string | null };
  vet: { id: string; firstName: string; lastName: string } | null;
  service: { id: string; name: string; durationMin: number } | null;
};

export function AppointmentDetail({
  appointment: a,
  slug,
}: {
  appointment: Appointment;
  slug: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = `/app/${slug}/appointments`;

  async function handleStatusChange(status: string | null) {
    if (!status) return;
    setLoading(true);
    await updateAppointmentStatus(a.id, status as AppointmentStatus);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await deleteAppointment(a.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Cita - ${a.pet.name}`}>
        <div className="flex gap-2">
          <Link href={base}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleting(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm border-0 shadow-black/5 lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                <Link
                  href={`/app/${slug}/clients/${a.owner.id}`}
                  className="hover:underline font-medium"
                >
                  {a.owner.firstName} {a.owner.lastName}
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">Mascota:</span>{" "}
                <Link
                  href={`/app/${slug}/pets/${a.pet.id}`}
                  className="hover:underline font-medium"
                >
                  {a.pet.name}
                </Link>{" "}
                ({a.pet.species})
              </div>
              <div>
                <span className="text-muted-foreground">Fecha:</span>{" "}
                {new Date(a.scheduledAt).toLocaleDateString("es-PA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div>
                <span className="text-muted-foreground">Hora:</span>{" "}
                {new Date(a.scheduledAt).toLocaleTimeString("es-PA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                <Badge variant="secondary">{a.type}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Duración:</span> {a.durationMin} min
              </div>
              <div>
                <span className="text-muted-foreground">Veterinario:</span>{" "}
                {a.vet ? `${a.vet.firstName} ${a.vet.lastName}` : "Sin asignar"}
              </div>
              <div>
                <span className="text-muted-foreground">Servicio:</span>{" "}
                {a.service?.name ?? "—"}
              </div>
              {a.reason && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Motivo:</span> {a.reason}
                </div>
              )}
              {a.notes && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Notas:</span> {a.notes}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-sm">Estado</h3>
            <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[a.status] ?? ""}`}>
              {a.status}
            </Badge>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Cambiar estado</label>
              <Select value={a.status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Programada</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                  <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                  <SelectItem value="COMPLETED">Completada</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  <SelectItem value="NO_SHOW">No Asistió</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {a.owner.phone && (
              <div>
                <label className="text-xs text-muted-foreground">Contacto</label>
                <p className="text-sm">{a.owner.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Eliminar Cita"
        description="¿Estás seguro de que deseas eliminar esta cita?"
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
