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
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleting(true)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <input type="hidden" name="ownerId" value={pet.owner.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input name="name" defaultValue={pet.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Especie</Label>
                  <Select name="species" defaultValue={pet.species}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input name="breed" defaultValue={pet.breed ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sexo</Label>
                  <Select name="sex" defaultValue={pet.sex}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Macho</SelectItem>
                      <SelectItem value="FEMALE">Hembra</SelectItem>
                      <SelectItem value="UNKNOWN">Desconocido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de nacimiento</Label>
                  <Input name="dateOfBirth" type="date" defaultValue={pet.dateOfBirth ? new Date(pet.dateOfBirth).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Peso (kg)</Label>
                  <Input name="weight" type="number" step="0.01" defaultValue={pet.weight ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Input name="color" defaultValue={pet.color ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Microchip</Label>
                  <Input name="microchipId" defaultValue={pet.microchipId ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Alergias</Label>
                <Textarea name="allergies" defaultValue={pet.allergies ?? ""} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea name="notes" defaultValue={pet.notes ?? ""} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Dueno:</span> <Link href={`/app/${slug}/clients/${pet.owner.id}`} className="hover:underline">{pet.owner.firstName} {pet.owner.lastName}</Link></div>
              <div><span className="text-muted-foreground">Especie:</span> <Badge variant="secondary">{pet.species}</Badge></div>
              <div><span className="text-muted-foreground">Raza:</span> {pet.breed || "\u2014"}</div>
              <div><span className="text-muted-foreground">Sexo:</span> {pet.sex}</div>
              <div><span className="text-muted-foreground">Fecha nac.:</span> {pet.dateOfBirth ? new Date(pet.dateOfBirth).toLocaleDateString("es-PA") : "\u2014"}</div>
              <div><span className="text-muted-foreground">Peso:</span> {pet.weight ? `${pet.weight} kg` : "\u2014"}</div>
              <div><span className="text-muted-foreground">Color:</span> {pet.color || "\u2014"}</div>
              <div><span className="text-muted-foreground">Microchip:</span> {pet.microchipId || "\u2014"}</div>
              {pet.allergies && <div className="sm:col-span-2"><span className="text-muted-foreground">Alergias:</span> {pet.allergies}</div>}
              {pet.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {pet.notes}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Desactivar Mascota"
        description="La mascota sera marcada como inactiva."
        confirmLabel="Desactivar"
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
