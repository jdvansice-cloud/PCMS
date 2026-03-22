"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Dog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTranslations } from "next-intl";
import { updateOwner, deleteOwner } from "../actions";

type Owner = {
  id: string;
  firstName: string;
  lastName: string;
  cedula: string | null;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  pets: { id: string; name: string; species: string; breed: string | null }[];
};

export function ClientDetail({ owner, slug }: { owner: Owner; slug: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = `/app/${slug}/clients`;
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tp = useTranslations("pets");

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await updateOwner(owner.id, fd);
    setLoading(false);
    if (result?.success) {
      setEditing(false);
      router.refresh();
    }
  }

  async function handleDelete() {
    setLoading(true);
    await deleteOwner(owner.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${owner.firstName} ${owner.lastName}`} backHref={base}>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("firstName")} *</Label>
                    <Input name="firstName" defaultValue={owner.firstName} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("lastName")} *</Label>
                    <Input name="lastName" defaultValue={owner.lastName} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("cedula")}</Label>
                    <Input name="cedula" defaultValue={owner.cedula ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("ruc")}</Label>
                    <Input name="ruc" defaultValue={owner.ruc ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tc("email")}</Label>
                    <Input name="email" type="email" defaultValue={owner.email ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{tc("phone")}</Label>
                    <Input name="phone" defaultValue={owner.phone ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("whatsapp")}</Label>
                    <Input name="whatsapp" defaultValue={owner.whatsapp ?? ""} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{tc("address")}</Label>
                  <Textarea name="address" defaultValue={owner.address ?? ""} rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>{tc("notes")}</Label>
                  <Textarea name="notes" defaultValue={owner.notes ?? ""} rows={2} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>{tc("cancel")}</Button>
                  <Button type="submit" disabled={loading}>{loading ? tf("saving") : tc("save")}</Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">{t("cedula")}:</span> {owner.cedula || "—"}</div>
                <div><span className="text-muted-foreground">{t("ruc")}:</span> {owner.ruc || "—"}</div>
                <div><span className="text-muted-foreground">{tc("email")}:</span> {owner.email || "—"}</div>
                <div><span className="text-muted-foreground">{tc("phone")}:</span> {owner.phone || "—"}</div>
                <div><span className="text-muted-foreground">{t("whatsapp")}:</span> {owner.whatsapp || "—"}</div>
                {owner.address && (
                  <div className="sm:col-span-2"><span className="text-muted-foreground">{tc("address")}:</span> {owner.address}</div>
                )}
                {owner.notes && (
                  <div className="sm:col-span-2"><span className="text-muted-foreground">{tc("notes")}:</span> {owner.notes}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <Dog className="h-4 w-4" /> {tp("title")}
              </h3>
              <Link href={`/app/${slug}/pets/new?ownerId=${owner.id}`}>
                <Button variant="outline" size="sm">+ {tc("add")}</Button>
              </Link>
            </div>
            {owner.pets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{tf("noPetsRegistered")}</p>
            ) : (
              <div className="space-y-2">
                {owner.pets.map((pet) => (
                  <Link key={pet.id} href={`/app/${slug}/pets/${pet.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-medium">{pet.name}</span>
                      <Badge variant="secondary" className="text-xs">{pet.breed || pet.species}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={tf("deleteClient")}
        description={tf("deleteClientConfirm")}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
