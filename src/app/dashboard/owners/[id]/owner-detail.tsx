"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Dog, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateOwner, deleteOwner } from "../actions";
import type { OwnerFormData } from "@/lib/validators/owner";

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
  createdAt: Date;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
  }[];
};

export function OwnerDetail({ owner }: { owner: Owner }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data: OwnerFormData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      cedula: formData.get("cedula") as string,
      ruc: formData.get("ruc") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      whatsapp: formData.get("whatsapp") as string,
      address: formData.get("address") as string,
      notes: formData.get("notes") as string,
    };

    const result = await updateOwner(owner.id, data);

    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    } else {
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteOwner(owner.id);
    // Server action redirects to list
  }

  const speciesLabel: Record<string, string> = {
    DOG: "Perro",
    CAT: "Gato",
    BIRD: "Ave",
    REPTILE: "Reptil",
    OTHER: "Otro",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/owners">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`${owner.firstName} ${owner.lastName}`}
          description={owner.cedula ? `Cédula: ${owner.cedula}` : undefined}
        >
          {!editing && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setEditing(true)}
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Owner info */}
        <Card className="lg:col-span-2 shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={owner.firstName}
                      required
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName[0]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={owner.lastName}
                      required
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName[0]}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cedula">Cédula</Label>
                    <Input
                      id="cedula"
                      name="cedula"
                      defaultValue={owner.cedula ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ruc">RUC</Label>
                    <Input
                      id="ruc"
                      name="ruc"
                      defaultValue={owner.ruc ?? ""}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={owner.phone ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      defaultValue={owner.whatsapp ?? ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={owner.email ?? ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={owner.address ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={owner.notes ?? ""}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setErrors({});
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                  Información del Cliente
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <InfoField label="Nombre" value={`${owner.firstName} ${owner.lastName}`} />
                  <InfoField label="Cédula" value={owner.cedula} />
                  <InfoField label="RUC" value={owner.ruc} />
                  <InfoField label="Teléfono" value={owner.phone} />
                  <InfoField label="WhatsApp" value={owner.whatsapp} />
                  <InfoField label="Email" value={owner.email} />
                  <InfoField label="Dirección" value={owner.address} className="sm:col-span-2" />
                  <InfoField label="Notas" value={owner.notes} className="sm:col-span-2" />
                </dl>
                <p className="text-xs text-muted-foreground pt-2">
                  Registrado el{" "}
                  {new Date(owner.createdAt).toLocaleDateString("es-PA", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pets sidebar */}
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dog className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Mascotas</h3>
              </div>
              <Badge variant="secondary">{owner.pets.length}</Badge>
            </div>

            {owner.pets.length === 0 ? (
              <div className="text-center py-8">
                <div className="rounded-full bg-muted p-3 mx-auto w-fit mb-3">
                  <Dog className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Sin mascotas registradas
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {owner.pets.map((pet) => (
                  <li key={pet.id}>
                    <Link
                      href={`/dashboard/pets/${pet.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted transition-colors"
                    >
                      <div className="rounded-full bg-muted p-2">
                        <Dog className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pet.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {speciesLabel[pet.species] ?? pet.species}
                          {pet.breed ? ` · ${pet.breed}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Eliminar cliente"
        description={`¿Estás seguro de eliminar a ${owner.firstName} ${owner.lastName}? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm mt-0.5">{value || "—"}</dd>
    </div>
  );
}
