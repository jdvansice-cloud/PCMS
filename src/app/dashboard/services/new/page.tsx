"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createService } from "../actions";
import type { ServiceFormData } from "@/lib/validators/service";

export default function NewServicePage() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const data: ServiceFormData = {
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      price: fd.get("price") as string,
      isTaxExempt: fd.get("isTaxExempt") === "on",
      type: fd.get("type") as ServiceFormData["type"],
      durationMin: fd.get("durationMin") as string,
    };

    const result = await createService(data);
    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/services">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title="Nuevo Servicio" description="Registra un nuevo servicio" />
      </div>

      <Card className="max-w-2xl shadow-sm border-0 shadow-black/5">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" required />
              {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea id="description" name="description" rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <select id="type" name="type" defaultValue="CONSULTATION"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
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
                <Label htmlFor="durationMin">Duración (min) *</Label>
                <Input id="durationMin" name="durationMin" type="number" min="5" step="5" defaultValue="30" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (ITBMS incluido) *</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" required />
                {errors.price && <p className="text-sm text-destructive">{errors.price[0]}</p>}
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isTaxExempt" className="rounded border-input" />
                  Exento de ITBMS
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar Servicio"}</Button>
              <Link href="/dashboard/services"><Button type="button" variant="outline">Cancelar</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
