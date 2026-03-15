"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
import { updateService, deleteService } from "../actions";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  durationMin: number;
  isTaxExempt: boolean;
  isBookable: boolean;
};

export function ServiceDetail({ service, slug }: { service: Service; slug: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = `/app/${slug}/services`;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateService(service.id, fd);
    setLoading(false);
    if (result?.success) {
      setEditing(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    setLoading(true);
    await deleteService(service.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={service.name}>
        <div className="flex gap-2">
          <Link href={base}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleting(true)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input name="name" defaultValue={service.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select name="type" defaultValue={service.type}>
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
                  <Input name="price" type="number" step="0.01" defaultValue={Number(service.price)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Duración (min) *</Label>
                  <Input name="durationMin" type="number" defaultValue={service.durationMin} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={service.description ?? ""} rows={2} />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isTaxExempt" defaultChecked={service.isTaxExempt} className="rounded" />
                  Exento de ITBMS
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isBookable" defaultChecked={service.isBookable} className="rounded" />
                  Reservable en línea
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="secondary">{service.type}</Badge></div>
              <div><span className="text-muted-foreground">Precio:</span> {formatCurrency(Number(service.price))}</div>
              <div><span className="text-muted-foreground">Duración:</span> {service.durationMin} min</div>
              <div><span className="text-muted-foreground">ITBMS:</span> {service.isTaxExempt ? "Exento" : "7%"}</div>
              <div><span className="text-muted-foreground">Reservable:</span> {service.isBookable ? "Sí" : "No"}</div>
              {service.description && <div className="sm:col-span-2"><span className="text-muted-foreground">Descripción:</span> {service.description}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Desactivar Servicio"
        description="El servicio será desactivado y no aparecerá en las búsquedas."
        confirmLabel="Desactivar"
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
