"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updatePet, deletePet } from "../actions";
import type { PetFormData } from "@/lib/validators/pet";

const speciesLabel: Record<string, string> = {
  DOG: "Perro",
  CAT: "Gato",
  BIRD: "Ave",
  REPTILE: "Reptil",
  RODENT: "Roedor",
  OTHER: "Otro",
};

const sexLabel: Record<string, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
  UNKNOWN: "Desconocido",
};

type Owner = { id: string; firstName: string; lastName: string };

type Pet = {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string;
  dateOfBirth: Date | null;
  weight: unknown;
  color: string | null;
  microchipId: string | null;
  allergies: string | null;
  notes: string | null;
  createdAt: Date;
  owner: { id: string; firstName: string; lastName: string; phone: string | null };
};

export function PetDetail({ pet, owners }: { pet: Pet; owners: Owner[] }) {
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
    const data: PetFormData = {
      ownerId: formData.get("ownerId") as string,
      name: formData.get("name") as string,
      species: formData.get("species") as PetFormData["species"],
      breed: formData.get("breed") as string,
      sex: formData.get("sex") as PetFormData["sex"],
      dateOfBirth: formData.get("dateOfBirth") as string,
      weight: formData.get("weight") as string,
      color: formData.get("color") as string,
      microchipId: formData.get("microchipId") as string,
      allergies: formData.get("allergies") as string,
      notes: formData.get("notes") as string,
    };

    const result = await updatePet(pet.id, data);
    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
    } else {
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await deletePet(pet.id);
  }

  const weightStr = pet.weight ? String(pet.weight) : null;
  const dobStr = pet.dateOfBirth
    ? new Date(pet.dateOfBirth).toISOString().split("T")[0]
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={pet.name}
          description={`${speciesLabel[pet.species] ?? pet.species}${pet.breed ? ` · ${pet.breed}` : ""}`}
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
        {/* Pet info */}
        <Card className="lg:col-span-2 shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ownerId">Dueño *</Label>
                  <select
                    id="ownerId"
                    name="ownerId"
                    required
                    defaultValue={pet.ownerId}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.firstName} {owner.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input id="name" name="name" defaultValue={pet.name} required />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name[0]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="species">Especie *</Label>
                    <select
                      id="species"
                      name="species"
                      defaultValue={pet.species}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="DOG">Perro</option>
                      <option value="CAT">Gato</option>
                      <option value="BIRD">Ave</option>
                      <option value="REPTILE">Reptil</option>
                      <option value="RODENT">Roedor</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="breed">Raza</Label>
                    <Input id="breed" name="breed" defaultValue={pet.breed ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sexo</Label>
                    <select
                      id="sex"
                      name="sex"
                      defaultValue={pet.sex}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="MALE">Macho</option>
                      <option value="FEMALE">Hembra</option>
                      <option value="UNKNOWN">Desconocido</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      defaultValue={dobStr}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={weightStr ?? ""}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input id="color" name="color" defaultValue={pet.color ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="microchipId">Microchip ID</Label>
                    <Input
                      id="microchipId"
                      name="microchipId"
                      defaultValue={pet.microchipId ?? ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Input
                    id="allergies"
                    name="allergies"
                    defaultValue={pet.allergies ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={pet.notes ?? ""}
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
                  Información de la Mascota
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <InfoField label="Nombre" value={pet.name} />
                  <InfoField label="Especie" value={speciesLabel[pet.species] ?? pet.species} />
                  <InfoField label="Raza" value={pet.breed} />
                  <InfoField label="Sexo" value={sexLabel[pet.sex] ?? pet.sex} />
                  <InfoField
                    label="Fecha de Nacimiento"
                    value={
                      pet.dateOfBirth
                        ? new Date(pet.dateOfBirth).toLocaleDateString("es-PA", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : null
                    }
                  />
                  <InfoField label="Peso" value={weightStr ? `${weightStr} kg` : null} />
                  <InfoField label="Color" value={pet.color} />
                  <InfoField label="Microchip" value={pet.microchipId} />
                  <InfoField label="Alergias" value={pet.allergies} className="sm:col-span-2" />
                  <InfoField label="Notas" value={pet.notes} className="sm:col-span-2" />
                </dl>
                <p className="text-xs text-muted-foreground pt-2">
                  Registrado el{" "}
                  {new Date(pet.createdAt).toLocaleDateString("es-PA", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owner sidebar */}
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Dueño</h3>
            </div>
            <Link
              href={`/dashboard/owners/${pet.owner.id}`}
              className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted transition-colors"
            >
              <div className="rounded-full bg-muted p-2">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {pet.owner.firstName} {pet.owner.lastName}
                </p>
                {pet.owner.phone && (
                  <p className="text-xs text-muted-foreground">{pet.owner.phone}</p>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Eliminar mascota"
        description={`¿Estás seguro de eliminar a ${pet.name}? Esta acción no se puede deshacer.`}
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
