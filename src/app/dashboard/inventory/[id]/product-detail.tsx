"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateProduct, deleteProduct } from "../actions";
import { formatCurrency } from "@/lib/utils";
import type { ProductFormData } from "@/lib/validators/product";

const categoryLabel: Record<string, string> = {
  FOOD: "Alimento", MEDICATION: "Medicamento", SUPPLEMENT: "Suplemento",
  ACCESSORY: "Accesorio", TOY: "Juguete", HYGIENE: "Higiene", OTHER: "Otro",
};

type Product = {
  id: string; name: string; description: string | null; sku: string | null;
  barcode: string | null; category: string; price: unknown; cost: unknown;
  isTaxExempt: boolean; stock: number; minStock: number; createdAt: Date;
};

export function ProductDetail({ product }: { product: Product }) {
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
    const data: ProductFormData = {
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      sku: fd.get("sku") as string,
      barcode: fd.get("barcode") as string,
      category: fd.get("category") as ProductFormData["category"],
      price: fd.get("price") as string,
      cost: fd.get("cost") as string,
      isTaxExempt: fd.get("isTaxExempt") === "on",
      stock: fd.get("stock") as string,
      minStock: fd.get("minStock") as string,
    };
    const result = await updateProduct(product.id, data);
    if (result?.error) setErrors(result.error as Record<string, string[]>);
    else setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteProduct(product.id);
  }

  const price = Number(product.price);
  const cost = product.cost ? Number(product.cost) : null;
  const lowStock = product.stock <= product.minStock && product.minStock > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title={product.name} description={`${categoryLabel[product.category]} · ${formatCurrency(price)}`}>
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
                <Input id="name" name="name" defaultValue={product.name} required />
                {errors.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea id="description" name="description" rows={2} defaultValue={product.description ?? ""}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <select id="category" name="category" defaultValue={product.category}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="FOOD">Alimento</option>
                    <option value="MEDICATION">Medicamento</option>
                    <option value="SUPPLEMENT">Suplemento</option>
                    <option value="ACCESSORY">Accesorio</option>
                    <option value="TOY">Juguete</option>
                    <option value="HYGIENE">Higiene</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" defaultValue={product.sku ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input id="barcode" name="barcode" defaultValue={product.barcode ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio Venta *</Label>
                  <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={String(price)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo Proveedor</Label>
                  <Input id="cost" name="cost" type="number" step="0.01" min="0" defaultValue={cost ? String(cost) : ""} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="isTaxExempt" id="isTaxExempt" defaultChecked={product.isTaxExempt} className="rounded border-input" />
                <Label htmlFor="isTaxExempt">Exento de ITBMS</Label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Actual *</Label>
                  <Input id="stock" name="stock" type="number" min="0" defaultValue={product.stock} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock Mínimo</Label>
                  <Input id="minStock" name="minStock" type="number" min="0" defaultValue={product.minStock} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar Cambios"}</Button>
                <Button type="button" variant="outline" onClick={() => { setEditing(false); setErrors({}); }}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Detalles del Producto</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoField label="Nombre" value={product.name} />
                <InfoField label="Categoría" value={categoryLabel[product.category] ?? product.category} />
                <InfoField label="SKU" value={product.sku} />
                <InfoField label="Código de Barras" value={product.barcode} />
                <InfoField label="Precio Venta" value={formatCurrency(price)} />
                <InfoField label="Costo Proveedor" value={cost ? formatCurrency(cost) : null} />
                <InfoField label="ITBMS" value={product.isTaxExempt ? "Exento" : "Incluido (7%)"} />
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Stock</dt>
                  <dd className="text-sm mt-0.5">
                    <span className={lowStock ? "text-destructive font-medium" : ""}>{product.stock}</span>
                    {product.minStock > 0 && <span className="text-muted-foreground"> / mín. {product.minStock}</span>}
                    {lowStock && <Badge variant="destructive" className="ml-2 text-xs">Bajo</Badge>}
                  </dd>
                </div>
                <InfoField label="Descripción" value={product.description} className="sm:col-span-2" />
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Eliminar producto"
        description={`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`}
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
