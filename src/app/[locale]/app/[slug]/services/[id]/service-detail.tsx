"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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

const ALL_SIZES = ["SMALL", "MEDIUM", "LARGE", "XL"] as const;

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  durationMin: number;
  isTaxExempt: boolean;
  isBookable: boolean;
  petSizes: string[];
};

export function ServiceDetail({ service, slug }: { service: Service; slug: string }) {
  const router = useRouter();
  const tc = useTranslations("common");
  const ts = useTranslations("services");
  const ta = useTranslations("appointments");
  const tf = useTranslations("form");
  const tp = useTranslations("pos");
  const tpets = useTranslations("pets");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(service.petSizes ?? []);
  const [editType, setEditType] = useState(service.type);
  const base = `/app/${slug}/services`;

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function toggleAllSizes() {
    setSelectedSizes((prev) =>
      prev.length === ALL_SIZES.length ? [] : [...ALL_SIZES]
    );
  }

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
      <PageHeader title={service.name} backHref={base}>
        {!editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-1" /> {tc("edit")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleting(true)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{tc("name")} *</Label>
                  <Input name="name" defaultValue={service.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{ta("type")} *</Label>
                  <Select name="type" value={editType} onValueChange={(v) => v && setEditType(v)}>
                    <SelectTrigger><SelectValue>{ts(`typeLabels.${editType}`)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSULTATION">{ts("typeLabels.CONSULTATION")}</SelectItem>
                      <SelectItem value="VACCINATION">{ts("typeLabels.VACCINATION")}</SelectItem>
                      <SelectItem value="SURGERY">{ts("typeLabels.SURGERY")}</SelectItem>
                      <SelectItem value="GROOMING">{ts("typeLabels.GROOMING")}</SelectItem>
                      <SelectItem value="FOLLOW_UP">{ts("typeLabels.FOLLOW_UP")}</SelectItem>
                      <SelectItem value="EMERGENCY">{ts("typeLabels.EMERGENCY")}</SelectItem>
                      <SelectItem value="OTHER">{ts("typeLabels.OTHER")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{tf("priceBs")} *</Label>
                  <Input name="price" type="number" step="0.01" defaultValue={Number(service.price)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{ts("duration")} (min) *</Label>
                  <Input name="durationMin" type="number" defaultValue={service.durationMin} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{tc("description")}</Label>
                <Textarea name="description" defaultValue={service.description ?? ""} rows={2} />
              </div>
              {/* Pet size availability */}
              <div className="space-y-1.5">
                <Label>{ts("petSizeAvailability")}</Label>
                <p className="text-xs text-muted-foreground">{ts("petSizeAvailabilityDesc")}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant={selectedSizes.length === 0 ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAllSizes()}
                  >
                    {ts("allSizes")}
                  </Badge>
                  {ALL_SIZES.map((size) => (
                    <Badge
                      key={size}
                      variant={selectedSizes.includes(size) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSize(size)}
                    >
                      {tpets(`sizeLabels.${size}`)}
                    </Badge>
                  ))}
                </div>
                {selectedSizes.map((size) => (
                  <input key={size} type="hidden" name="petSizes" value={size} />
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isTaxExempt" defaultChecked={service.isTaxExempt} className="rounded" />
                  {tf("taxExempt")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isBookable" defaultChecked={service.isBookable} className="rounded" />
                  {tf("bookableOnline")}
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>{tc("cancel")}</Button>
                <Button type="submit" disabled={loading}>{loading ? tf("saving") : tc("save")}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">{ta("type")}:</span> <Badge variant="secondary">{ts(`typeLabels.${service.type}`)}</Badge></div>
              <div><span className="text-muted-foreground">{tc("price")}:</span> {formatCurrency(Number(service.price))}</div>
              <div><span className="text-muted-foreground">{ts("duration")}:</span> {service.durationMin} min</div>
              <div><span className="text-muted-foreground">ITBMS:</span> {service.isTaxExempt ? tp("exempt") : "7%"}</div>
              <div><span className="text-muted-foreground">{ts("bookable")}:</span> {service.isBookable ? tc("yes") : tc("no")}</div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">{ts("petSizeAvailability")}:</span>{" "}
                {service.petSizes.length === 0
                  ? ts("allSizes")
                  : service.petSizes.map((s) => tpets(`sizeLabels.${s}`)).join(", ")}
              </div>
              {service.description && <div className="sm:col-span-2"><span className="text-muted-foreground">{tc("description")}:</span> {service.description}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={tf("deactivateService")}
        description={tf("deactivateServiceConfirm")}
        confirmLabel={tf("deactivateService")}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
