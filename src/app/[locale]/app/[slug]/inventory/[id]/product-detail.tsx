"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency } from "@/lib/utils";
import { updateProduct, deleteProduct } from "../actions";

type Product = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category: string;
  price: number;
  cost: number | null;
  isTaxExempt: boolean;
  stock: number;
  minStock: number;
  expirationDate: Date | null;
  batchNumber: string | null;
};

export function ProductDetail({ product: p, slug }: { product: Product; slug: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = `/app/${slug}/inventory`;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateProduct(p.id, fd);
    setLoading(false);
    if (result?.success) {
      setEditing(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    setLoading(true);
    await deleteProduct(p.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={p.name}>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleting(true)}
                className="text-destructive"
              >
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
                  <Input name="name" defaultValue={p.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select name="category" defaultValue={p.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOOD">Alimento</SelectItem>
                      <SelectItem value="MEDICATION">Medicamento</SelectItem>
                      <SelectItem value="SUPPLEMENT">Suplemento</SelectItem>
                      <SelectItem value="ACCESSORY">Accesorio</SelectItem>
                      <SelectItem value="TOY">Juguete</SelectItem>
                      <SelectItem value="HYGIENE">Higiene</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Precio (B/.) *</Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={Number(p.price)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Costo</Label>
                  <Input
                    name="cost"
                    type="number"
                    step="0.01"
                    defaultValue={p.cost ? Number(p.cost) : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  <Input name="sku" defaultValue={p.sku ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Código de barras</Label>
                  <Input name="barcode" defaultValue={p.barcode ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input name="stock" type="number" defaultValue={p.stock} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stock mínimo</Label>
                  <Input name="minStock" type="number" defaultValue={p.minStock} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de vencimiento</Label>
                  <Input
                    name="expirationDate"
                    type="date"
                    defaultValue={
                      p.expirationDate
                        ? new Date(p.expirationDate).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Número de lote</Label>
                  <Input name="batchNumber" defaultValue={p.batchNumber ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={p.description ?? ""} rows={2} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isTaxExempt"
                  defaultChecked={p.isTaxExempt}
                  className="rounded"
                />
                Exento de ITBMS
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">Categoría:</span>{" "}
                <Badge variant="secondary">{p.category}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Precio:</span>{" "}
                {formatCurrency(Number(p.price))}
              </div>
              <div>
                <span className="text-muted-foreground">Costo:</span>{" "}
                {p.cost ? formatCurrency(Number(p.cost)) : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">ITBMS:</span>{" "}
                {p.isTaxExempt ? "Exento" : "7%"}
              </div>
              <div>
                <span className="text-muted-foreground">SKU:</span> {p.sku || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Código de barras:</span>{" "}
                {p.barcode || "—"}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Stock:</span> {p.stock}
                {p.stock <= p.minStock && (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Stock mín.:</span> {p.minStock}
              </div>
              {p.expirationDate && (
                <div>
                  <span className="text-muted-foreground">Vencimiento:</span>{" "}
                  {new Date(p.expirationDate).toLocaleDateString("es-PA")}
                </div>
              )}
              {p.batchNumber && (
                <div>
                  <span className="text-muted-foreground">Lote:</span> {p.batchNumber}
                </div>
              )}
              {p.description && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Descripción:</span> {p.description}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Desactivar Producto"
        description="El producto será desactivado y no aparecerá en búsquedas."
        confirmLabel="Desactivar"
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
