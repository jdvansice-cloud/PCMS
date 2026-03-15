"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { createAppointment } from "./actions";

type FormData = {
  owners: {
    id: string;
    firstName: string;
    lastName: string;
    pets: { id: string; name: string }[];
  }[];
  vets: { id: string; firstName: string; lastName: string }[];
  services: { id: string; name: string; type: string; durationMin: number }[];
  branchId: string;
};

export function AppointmentForm({ data, slug }: { data: FormData; slug: string }) {
  const base = `/app/${slug}/appointments`;
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const selectedOwner = data.owners.find((o) => o.id === selectedOwnerId);
  const selectedService = data.services.find((s) => s.id === selectedServiceId);

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Cita">
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form action={createAppointment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select
                  name="ownerId"
                  value={selectedOwnerId}
                  onValueChange={(v) => setSelectedOwnerId(v ?? "")}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.firstName} {o.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mascota *</Label>
                <Select name="petId" required disabled={!selectedOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mascota" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOwner?.pets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Veterinario</Label>
                <Select name="vetId">
                  <SelectTrigger>
                    <SelectValue placeholder="Asignar después" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.vets.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.firstName} {v.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Servicio</Label>
                <Select
                  name="serviceId"
                  value={selectedServiceId}
                  onValueChange={(v) => setSelectedServiceId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.durationMin} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select name="type" defaultValue={selectedService?.type ?? "CONSULTATION"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">Consulta</SelectItem>
                    <SelectItem value="VACCINATION">Vacunación</SelectItem>
                    <SelectItem value="SURGERY">Cirugía</SelectItem>
                    <SelectItem value="GROOMING">Peluquería</SelectItem>
                    <SelectItem value="FOLLOW_UP">Seguimiento</SelectItem>
                    <SelectItem value="EMERGENCY">Emergencia</SelectItem>
                    <SelectItem value="OTHER">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha y hora *</Label>
                <Input name="scheduledAt" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label>Duración (min)</Label>
                <Input
                  name="durationMin"
                  type="number"
                  defaultValue={selectedService?.durationMin ?? 30}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Textarea name="reason" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
