"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateService, deleteService } from "../actions";
import { formatCurrency } from "@/lib/utils";
import type { ServiceFormData } from "@/lib/validators/service";

const typeLabel: Record<string, string> = {
  CONSULTATION: "Consulta", VACCINATION: "Vacunación", SURGERY: "Cirugía",
  GROOMING: "Peluquería", FOLLOW_UP: "Seguimiento", EMERGENCY: "Emergencia", OTHER: "Otro",
};

type Service = {
  id: string; name: string; description: string | null; price: unknown;
  isTaxExempt: boolean; type: string; durationMin: number; createdAt: Date;
};

export function ServiceDetail({ service }: { service: Service }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
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
    const result = await updateService(service.id, data);
    if (result?.error) setErrors(result.error as Record<string, string[]>);
    else setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteService(service.id);
  }

  const price = Number(service.price);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/services">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title={service.name} description={`${typeLabel[service.type]} · ${service.durationMin} min · ${formatCurrency(price)}`}>
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

      <Card className="max-w-2xl shadow-sm border-0 shadow-black/5">
        <CardContent className="p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" name="name" defaultValue={service.name} required />
                {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea id="description" name="description" rows={2} defaultValue={service.description ?? ""}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <select id="type" name="type" defaultValue={service.type}
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
                  <Input id="durationMin" name="durationMin" type="number" min="5" step="5" defaultValue={service.durationMin} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (ITBMS incluido) *</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={String(price)} required />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="isTaxExempt" defaultChecked={service.isTaxExempt} className="rounded border-input" />
                    Exento de ITBMS
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</Button>
                <Button type="button" variant="outline" onClick={() => { setEditing(false); setErrors({}); }}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Detalles del Servicio</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoField label="Nombre" value={service.name} />
                <InfoField label="Tipo" value={typeLabel[service.type] ?? service.type} />
                <InfoField label="Duración" value={`${service.durationMin} minutos`} />
                <InfoField label="Precio" value={formatCurrency(price)} />
                <InfoField label="ITBMS" value={service.isTaxExempt ? "Exento" : "Incluido (7%)"} />
                <InfoField label="Descripción" value={service.description} className="sm:col-span-2" />
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Eliminar servicio"
        description={`¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}

function InfoField({ label, value, className }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm mt-0.5">{value || "—"}</dd>
    </div>
  );
}
