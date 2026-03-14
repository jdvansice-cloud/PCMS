"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createPet } from "./actions";
import type { PetFormData } from "@/lib/validators/pet";

type Owner = { id: string; firstName: string; lastName: string };

export function PetForm({
  owners,
  defaultOwnerId,
}: {
  owners: Owner[];
  defaultOwnerId?: string;
}) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    const result = await createPet(data);
    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Nueva Mascota"
          description="Registra una nueva mascota en el sistema"
        />
      </div>

      <Card className="max-w-2xl shadow-sm border-0 shadow-black/5">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Owner selector */}
            <div className="space-y-2">
              <Label htmlFor="ownerId">Dueño *</Label>
              <select
                id="ownerId"
                name="ownerId"
                required
                defaultValue={defaultOwnerId ?? ""}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seleccionar dueño...</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </select>
              {errors.ownerId && (
                <p className="text-sm text-destructive">{errors.ownerId[0]}</p>
              )}
            </div>

            {/* Name and species */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" name="name" required />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="species">Especie *</Label>
                <select
                  id="species"
                  name="species"
                  defaultValue="DOG"
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

            {/* Breed and sex */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="breed">Raza</Label>
                <Input id="breed" name="breed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sexo</Label>
                <select
                  id="sex"
                  name="sex"
                  defaultValue="UNKNOWN"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MALE">Macho</option>
                  <option value="FEMALE">Hembra</option>
                  <option value="UNKNOWN">Desconocido</option>
                </select>
              </div>
            </div>

            {/* Date of birth and weight */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Color and microchip */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" name="color" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="microchipId">Microchip ID</Label>
                <Input id="microchipId" name="microchipId" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Input id="allergies" name="allergies" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Mascota"}
              </Button>
              <Link href="/dashboard/pets">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
