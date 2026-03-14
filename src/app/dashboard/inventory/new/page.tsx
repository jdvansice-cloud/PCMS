"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createProduct } from "../actions";
import type { ProductFormData } from "@/lib/validators/product";

export default function NewProductPage() {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    const result = await createProduct(data);
    if (result?.error) { setErrors(result.error as Record<string, string[]>); setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title="Nuevo Producto" description="Registra un nuevo producto en inventario" />
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
                <Label htmlFor="category">Categoría *</Label>
                <select id="category" name="category" defaultValue="OTHER"
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
                <Input id="sku" name="sku" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input id="barcode" name="barcode" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Precio Venta (ITBMS incluido) *</Label>
                <Input id="price" name="price" type="number" step="0.01" min="0" required />
                {errors.price && <p className="text-sm text-destructive">{errors.price[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Costo Proveedor</Label>
                <Input id="cost" name="cost" type="number" step="0.01" min="0" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="isTaxExempt" id="isTaxExempt" className="rounded border-input" />
              <Label htmlFor="isTaxExempt">Exento de ITBMS</Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Actual *</Label>
                <Input id="stock" name="stock" type="number" min="0" defaultValue="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stock Mínimo (alerta)</Label>
                <Input id="minStock" name="minStock" type="number" min="0" defaultValue="0" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar Producto"}</Button>
              <Link href="/dashboard/inventory"><Button type="button" variant="outline">Cancelar</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
