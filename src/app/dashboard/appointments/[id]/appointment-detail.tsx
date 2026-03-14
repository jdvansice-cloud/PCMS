"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, User, Dog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateAppointment, deleteAppointment } from "../actions";
import type { AppointmentFormData } from "@/lib/validators/appointment";

const typeLabel: Record<string, string> = {
  CONSULTATION: "Consulta", VACCINATION: "Vacunación", SURGERY: "Cirugía",
  GROOMING: "Peluquería", FOLLOW_UP: "Seguimiento", EMERGENCY: "Emergencia", OTHER: "Otro",
};
const statusLabel: Record<string, string> = {
  SCHEDULED: "Programada", CONFIRMED: "Confirmada", IN_PROGRESS: "En Progreso",
  COMPLETED: "Completada", CANCELLED: "Cancelada", NO_SHOW: "No Asistió",
};
const statusColor: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700", CONFIRMED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700", COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700", NO_SHOW: "bg-orange-100 text-orange-700",
};

type Owner = { id: string; firstName: string; lastName: string; pets: { id: string; name: string }[] };
type Vet = { id: string; firstName: string; lastName: string };
type Appointment = {
  id: string; ownerId: string; petId: string; vetId: string | null;
  type: string; status: string; scheduledAt: Date; durationMin: number;
  reason: string | null; notes: string | null;
  owner: { id: string; firstName: string; lastName: string; phone: string | null };
  pet: { id: string; name: string; species: string; breed: string | null };
  vet: { id: string; firstName: string; lastName: string } | null;
};

export function AppointmentDetail({ appointment: apt, owners, vets }: { appointment: Appointment; owners: Owner[]; vets: Vet[] }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedOwnerId, setSelectedOwnerId] = useState(apt.ownerId);

  const selectedOwner = owners.find((o) => o.id === selectedOwnerId);
  const pets = selectedOwner?.pets ?? [];
  const scheduledStr = new Date(apt.scheduledAt).toISOString().slice(0, 16);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const data: AppointmentFormData = {
      ownerId: fd.get("ownerId") as string,
      petId: fd.get("petId") as string,
      vetId: fd.get("vetId") as string,
      type: fd.get("type") as AppointmentFormData["type"],
      status: fd.get("status") as AppointmentFormData["status"],
      scheduledAt: fd.get("scheduledAt") as string,
      durationMin: fd.get("durationMin") as string,
      reason: fd.get("reason") as string,
      notes: fd.get("notes") as string,
    };
    const result = await updateAppointment(apt.id, data);
    if (result?.error) setErrors(result.error as Record<string, string[]>);
    else setEditing(false);
    setSaving(false);
  }

  async function handleDelete() { setDeleting(true); await deleteAppointment(apt.id); }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/appointments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader
          title={`Cita — ${apt.pet.name}`}
          description={`${new Date(apt.scheduledAt).toLocaleDateString("es-PA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · ${new Date(apt.scheduledAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}`}
        >
          {!editing && (
            <>
              <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4" />Editar
              </Button>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" />Eliminar
              </Button>
            </>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ownerId">Cliente *</Label>
                    <select id="ownerId" name="ownerId" required value={selectedOwnerId}
                      onChange={(e) => setSelectedOwnerId(e.target.value)} className={selectClass}>
                      {owners.map((o) => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="petId">Mascota *</Label>
                    <select id="petId" name="petId" required defaultValue={apt.petId} className={selectClass}>
                      {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">Fecha y Hora *</Label>
                    <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={scheduledStr} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMin">Duración (min) *</Label>
                    <Input id="durationMin" name="durationMin" type="number" min="5" step="5" defaultValue={apt.durationMin} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <select id="type" name="type" defaultValue={apt.type} className={selectClass}>
                      <option value="CONSULTATION">Consulta</option>
                      <option value="VACCINATION">Vacunación</option>
                      <option value="SURGERY">Cirugía</option>
                      <option value="GROOMING">Peluquería</option>
                      <option value="FOLLOW_UP">Seguimiento</option>
                      <option value="EMERGENCY">Emergencia</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <select id="status" name="status" defaultValue={apt.status} className={selectClass}>
                      <option value="SCHEDULED">Programada</option>
                      <option value="CONFIRMED">Confirmada</option>
                      <option value="IN_PROGRESS">En Progreso</option>
                      <option value="COMPLETED">Completada</option>
                      <option value="CANCELLED">Cancelada</option>
                      <option value="NO_SHOW">No Asistió</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vetId">Veterinario</Label>
                    <select id="vetId" name="vetId" defaultValue={apt.vetId ?? ""} className={selectClass}>
                      <option value="">Sin asignar</option>
                      {vets.map((v) => <option key={v.id} value={v.id}>{v.firstName} {v.lastName}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Input id="reason" name="reason" defaultValue={apt.reason ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <textarea id="notes" name="notes" rows={3} defaultValue={apt.notes ?? ""}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setEditing(false); setErrors({}); }}>Cancelar</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Detalles de la Cita</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <InfoField label="Fecha" value={new Date(apt.scheduledAt).toLocaleDateString("es-PA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} />
                  <InfoField label="Hora" value={`${new Date(apt.scheduledAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })} · ${apt.durationMin} min`} />
                  <InfoField label="Tipo" value={typeLabel[apt.type] ?? apt.type} />
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Estado</dt>
                    <dd className="mt-0.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[apt.status] ?? ""}`}>
                        {statusLabel[apt.status] ?? apt.status}
                      </span>
                    </dd>
                  </div>
                  <InfoField label="Veterinario" value={apt.vet ? `${apt.vet.firstName} ${apt.vet.lastName}` : null} />
                  <InfoField label="Motivo" value={apt.reason} />
                  <InfoField label="Notas" value={apt.notes} className="sm:col-span-2" />
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-sm border-0 shadow-black/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Dog className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Mascota</h3>
              </div>
              <Link href={`/dashboard/pets/${apt.pet.id}`} className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted transition-colors">
                <div className="rounded-full bg-muted p-2"><Dog className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-sm font-medium">{apt.pet.name}</p>
                  <p className="text-xs text-muted-foreground">{apt.pet.breed || apt.pet.species}</p>
                </div>
              </Link>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-0 shadow-black/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Cliente</h3>
              </div>
              <Link href={`/dashboard/owners/${apt.owner.id}`} className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted transition-colors">
                <div className="rounded-full bg-muted p-2"><User className="h-4 w-4 text-muted-foreground" /></div>
                <div>
                  <p className="text-sm font-medium">{apt.owner.firstName} {apt.owner.lastName}</p>
                  {apt.owner.phone && <p className="text-xs text-muted-foreground">{apt.owner.phone}</p>}
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Eliminar cita"
        description="¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer."
        onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}

function InfoField({ label, value, className }: { label: string; value: string | null; className?: string }) {
  return <div className={className}><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="text-sm mt-0.5">{value || "—"}</dd></div>;
}
