"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createAppointment } from "./actions";
import type { AppointmentFormData } from "@/lib/validators/appointment";

type Owner = { id: string; firstName: string; lastName: string; pets: { id: string; name: string }[] };
type Vet = { id: string; firstName: string; lastName: string };

export function AppointmentForm({ owners, vets }: { owners: Owner[]; vets: Vet[] }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  const selectedOwner = owners.find((o) => o.id === selectedOwnerId);
  const pets = selectedOwner?.pets ?? [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const data: AppointmentFormData = {
      ownerId: fd.get("ownerId") as string,
      petId: fd.get("petId") as string,
      vetId: fd.get("vetId") as string,
      type: fd.get("type") as AppointmentFormData["type"],
      status: "SCHEDULED",
      scheduledAt: fd.get("scheduledAt") as string,
      durationMin: fd.get("durationMin") as string,
      reason: fd.get("reason") as string,
      notes: fd.get("notes") as string,
    };
    const result = await createAppointment(data);
    if (result?.error) { setErrors(result.error as Record<string, string[]>); setSaving(false); }
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/appointments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title="Nueva Cita" description="Programa una nueva cita" />
      </div>

      <Card className="max-w-2xl shadow-sm border-0 shadow-black/5">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerId">Cliente *</Label>
                <select id="ownerId" name="ownerId" required value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar cliente...</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
                  ))}
                </select>
                {errors.ownerId && <p className="text-sm text-destructive">{errors.ownerId[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="petId">Mascota *</Label>
                <select id="petId" name="petId" required disabled={!selectedOwnerId} className={selectClass}>
                  <option value="">{selectedOwnerId ? "Seleccionar mascota..." : "Primero selecciona cliente"}</option>
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.petId && <p className="text-sm text-destructive">{errors.petId[0]}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Fecha y Hora *</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
                {errors.scheduledAt && <p className="text-sm text-destructive">{errors.scheduledAt[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMin">Duración (min) *</Label>
                <Input id="durationMin" name="durationMin" type="number" min="5" step="5" defaultValue="30" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <select id="type" name="type" defaultValue="CONSULTATION" className={selectClass}>
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
                <Label htmlFor="vetId">Veterinario</Label>
                <select id="vetId" name="vetId" className={selectClass}>
                  <option value="">Sin asignar</option>
                  {vets.map((v) => (
                    <option key={v.id} value={v.id}>{v.firstName} {v.lastName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input id="reason" name="reason" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <textarea id="notes" name="notes" rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Programar Cita"}</Button>
              <Link href="/dashboard/appointments"><Button type="button" variant="outline">Cancelar</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
