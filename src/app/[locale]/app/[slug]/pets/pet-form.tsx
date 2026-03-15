"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { createPet } from "./actions";

type Owner = { id: string; firstName: string; lastName: string };

export function PetForm({
  slug,
  owners,
  defaultOwnerId,
}: {
  slug: string;
  owners: Owner[];
  defaultOwnerId?: string;
}) {
  const base = `/app/${slug}/pets`;

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva Mascota">
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form action={createPet} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Dueno *</Label>
                <Select name="ownerId" defaultValue={defaultOwnerId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar dueno" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.firstName} {o.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Especie *</Label>
                <Select name="species" defaultValue="DOG">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOG">Perro</SelectItem>
                    <SelectItem value="CAT">Gato</SelectItem>
                    <SelectItem value="BIRD">Ave</SelectItem>
                    <SelectItem value="REPTILE">Reptil</SelectItem>
                    <SelectItem value="RODENT">Roedor</SelectItem>
                    <SelectItem value="OTHER">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Raza</Label>
                <Input name="breed" />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select name="sex" defaultValue="UNKNOWN">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Macho</SelectItem>
                    <SelectItem value="FEMALE">Hembra</SelectItem>
                    <SelectItem value="UNKNOWN">Desconocido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento</Label>
                <Input name="dateOfBirth" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>Peso (kg)</Label>
                <Input name="weight" type="number" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input name="color" />
              </div>
              <div className="space-y-1.5">
                <Label>Microchip</Label>
                <Input name="microchipId" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Alergias</Label>
              <Textarea name="allergies" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
