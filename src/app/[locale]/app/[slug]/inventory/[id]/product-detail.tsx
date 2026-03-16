"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const tc = useTranslations("common");
  const ti = useTranslations("inventory");
  const tf = useTranslations("form");
  const tp = useTranslations("pos");
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
              <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
            </Button>
          </Link>
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> {tc("edit")}
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

      <Card>
        <CardContent className="p-4 sm:p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{tc("name")} *</Label>
                  <Input name="name" defaultValue={p.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("category")}</Label>
                  <Select name="category" defaultValue={p.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOOD">{ti("categoryLabels.FOOD")}</SelectItem>
                      <SelectItem value="MEDICATION">{ti("categoryLabels.MEDICATION")}</SelectItem>
                      <SelectItem value="SUPPLEMENT">{ti("categoryLabels.SUPPLEMENT")}</SelectItem>
                      <SelectItem value="ACCESSORY">{ti("categoryLabels.ACCESSORY")}</SelectItem>
                      <SelectItem value="TOY">{ti("categoryLabels.TOY")}</SelectItem>
                      <SelectItem value="HYGIENE">{ti("categoryLabels.HYGIENE")}</SelectItem>
                      <SelectItem value="OTHER">{ti("categoryLabels.OTHER")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{tf("priceBs")} *</Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={Number(p.price)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("cost")}</Label>
                  <Input
                    name="cost"
                    type="number"
                    step="0.01"
                    defaultValue={p.cost ? Number(p.cost) : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("sku")}</Label>
                  <Input name="sku" defaultValue={p.sku ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("barcode")}</Label>
                  <Input name="barcode" defaultValue={p.barcode ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("stock")}</Label>
                  <Input name="stock" type="number" defaultValue={p.stock} />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("minStock")}</Label>
                  <Input name="minStock" type="number" defaultValue={p.minStock} />
                </div>
                <div className="space-y-1.5">
                  <Label>{ti("expiration")}</Label>
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
                  <Label>{tf("batchNumber")}</Label>
                  <Input name="batchNumber" defaultValue={p.batchNumber ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{tc("description")}</Label>
                <Textarea name="description" defaultValue={p.description ?? ""} rows={2} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isTaxExempt"
                  defaultChecked={p.isTaxExempt}
                  className="rounded"
                />
                {tf("taxExempt")}
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? tf("saving") : tc("save")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">{ti("category")}:</span>{" "}
                <Badge variant="secondary">{ti(`categoryLabels.${p.category}`)}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{tc("price")}:</span>{" "}
                {formatCurrency(Number(p.price))}
              </div>
              <div>
                <span className="text-muted-foreground">{ti("cost")}:</span>{" "}
                {p.cost ? formatCurrency(Number(p.cost)) : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">ITBMS:</span>{" "}
                {p.isTaxExempt ? tp("exempt") : "7%"}
              </div>
              <div>
                <span className="text-muted-foreground">{ti("sku")}:</span> {p.sku || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">{ti("barcode")}:</span>{" "}
                {p.barcode || "—"}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">{ti("stock")}:</span> {p.stock}
                {p.stock <= p.minStock && (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{ti("minStock")}:</span> {p.minStock}
              </div>
              {p.expirationDate && (
                <div>
                  <span className="text-muted-foreground">{ti("expiration")}:</span>{" "}
                  {new Date(p.expirationDate).toLocaleDateString("es-PA")}
                </div>
              )}
              {p.batchNumber && (
                <div>
                  <span className="text-muted-foreground">{tf("batchNumber")}:</span> {p.batchNumber}
                </div>
              )}
              {p.description && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">{tc("description")}:</span> {p.description}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={tf("deactivateProduct")}
        description={tf("deactivateProductConfirm")}
        confirmLabel={tf("deactivateProduct")}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
