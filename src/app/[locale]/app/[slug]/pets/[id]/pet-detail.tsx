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
import { useTranslations } from "next-intl";
import { updatePet, deletePet } from "../actions";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string;
  dateOfBirth: Date | null;
  weight: number | null;
  color: string | null;
  microchipId: string | null;
  allergies: string | null;
  notes: string | null;
  owner: { id: string; firstName: string; lastName: string };
};

export function PetDetail({ pet, slug }: { pet: Pet; slug: string }) {
  const router = useRouter();
  const t = useTranslations("pets");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = `/app/${slug}/pets`;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await updatePet(pet.id, fd);
    setLoading(false);
    if (result?.success) {
      setEditing(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    setLoading(true);
    await deletePet(pet.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={pet.name}>
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
              <Button variant="outline" size="sm" onClick={() => setDeleting(true)} className="text-destructive">
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
              <input type="hidden" name="ownerId" value={pet.owner.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{tc("name")} *</Label>
                  <Input name="name" defaultValue={pet.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("species")}</Label>
                  <Select name="species" defaultValue={pet.species}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOG">{t("speciesLabels.DOG")}</SelectItem>
                      <SelectItem value="CAT">{t("speciesLabels.CAT")}</SelectItem>
                      <SelectItem value="BIRD">{t("speciesLabels.BIRD")}</SelectItem>
                      <SelectItem value="REPTILE">{t("speciesLabels.REPTILE")}</SelectItem>
                      <SelectItem value="RODENT">{t("speciesLabels.RODENT")}</SelectItem>
                      <SelectItem value="OTHER">{t("speciesLabels.OTHER")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("breed")}</Label>
                  <Input name="breed" defaultValue={pet.breed ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("sex")}</Label>
                  <Select name="sex" defaultValue={pet.sex}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">{t("sexLabels.MALE")}</SelectItem>
                      <SelectItem value="FEMALE">{t("sexLabels.FEMALE")}</SelectItem>
                      <SelectItem value="UNKNOWN">{t("sexLabels.UNKNOWN")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("dateOfBirth")}</Label>
                  <Input name="dateOfBirth" type="date" defaultValue={pet.dateOfBirth ? new Date(pet.dateOfBirth).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("weight")}</Label>
                  <Input name="weight" type="number" step="0.01" defaultValue={pet.weight ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("color")}</Label>
                  <Input name="color" defaultValue={pet.color ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("microchip")}</Label>
                  <Input name="microchipId" defaultValue={pet.microchipId ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("allergies")}</Label>
                <Textarea name="allergies" defaultValue={pet.allergies ?? ""} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("notes")}</Label>
                <Textarea name="notes" defaultValue={pet.notes ?? ""} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>{tc("cancel")}</Button>
                <Button type="submit" disabled={loading}>{loading ? tf("saving") : tc("save")}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">{t("owner")}:</span> <Link href={`/app/${slug}/clients/${pet.owner.id}`} className="hover:underline">{pet.owner.firstName} {pet.owner.lastName}</Link></div>
              <div><span className="text-muted-foreground">{t("species")}:</span> <Badge variant="secondary">{pet.species}</Badge></div>
              <div><span className="text-muted-foreground">{t("breed")}:</span> {pet.breed || "\u2014"}</div>
              <div><span className="text-muted-foreground">{t("sex")}:</span> {pet.sex}</div>
              <div><span className="text-muted-foreground">{t("dateOfBirth")}:</span> {pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString("es-PA") : "\u2014"}</div>
              <div><span className="text-muted-foreground">{t("weight")}:</span> {pet.weight ? `${pet.weight} kg` : "\u2014"}</div>
              <div><span className="text-muted-foreground">{t("color")}:</span> {pet.color || "\u2014"}</div>
              <div><span className="text-muted-foreground">{t("microchip")}:</span> {pet.microchipId || "\u2014"}</div>
              {pet.allergies && <div className="sm:col-span-2"><span className="text-muted-foreground">{t("allergies")}:</span> {pet.allergies}</div>}
              {pet.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">{tc("notes")}:</span> {pet.notes}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={tf("deactivatePet")}
        description={tf("deactivatePetConfirm")}
        confirmLabel={tf("deactivatePet")}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
