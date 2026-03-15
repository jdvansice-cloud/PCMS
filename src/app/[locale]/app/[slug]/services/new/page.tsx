"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { createService } from "../actions";

export default function NewServicePage() {
  const { organization } = useTenant();
  const base = `/app/${organization.slug}/services`;

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Servicio">
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form action={createService} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select name="type" defaultValue="CONSULTATION">
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Precio (B/.) *</Label>
                <Input name="price" type="number" step="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label>Duración (min) *</Label>
                <Input name="durationMin" type="number" defaultValue="30" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea name="description" rows={2} />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isTaxExempt" className="rounded" />
                Exento de ITBMS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isBookable" defaultChecked className="rounded" />
                Reservable en línea
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
