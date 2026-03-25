"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getMyPets, createMyPet } from "../actions";
import { PawPrint, Plus, Loader2 } from "lucide-react";

type Pet = Awaited<ReturnType<typeof getMyPets>>[number];

const SPECIES = ["DOG", "CAT", "BIRD", "REPTILE", "RODENT", "OTHER"] as const;
const SEXES = ["MALE", "FEMALE", "UNKNOWN"] as const;
const SIZES = ["SMALL", "MEDIUM", "LARGE", "XL"] as const;

export default function PortalPetsPage() {
  const t = useTranslations("portal.pets");
  const { organization } = usePortalTenant();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  function loadPets() {
    setLoading(true);
    getMyPets().then((p) => { setPets(p); setLoading(false); });
  }

  useEffect(() => { loadPets(); }, []);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> {t("addPet")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("addPet")}</DialogTitle>
            </DialogHeader>
            <AddPetForm
              onSuccess={() => { setDialogOpen(false); loadPets(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <PawPrint className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("noPets")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/portal/${organization.slug}/pets/${pet.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  {pet.photoUrl ? (
                    <img
                      src={pet.photoUrl}
                      alt={pet.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                      <PawPrint className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">{pet.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {pet.breed ?? t(`species_${pet.species}`)}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {t(`species_${pet.species}`)}
                      </Badge>
                      {pet.size && (
                        <Badge variant="secondary" className="text-xs">
                          {t(`size_${pet.size}`)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPetForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("portal.pets");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<(typeof SPECIES)[number]>("DOG");
  const [sex, setSex] = useState<(typeof SEXES)[number]>("MALE");
  const [size, setSize] = useState<(typeof SIZES)[number]>("MEDIUM");
  const [color, setColor] = useState("");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [weight, setWeight] = useState("");
  const [allergies, setAllergies] = useState("");
  const [microchipId, setMicrochipId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await createMyPet({
        name,
        species,
        sex,
        size,
        color,
        breed: breed || null,
        dateOfBirth: dateOfBirth || null,
        weight: weight ? parseFloat(weight) : null,
        allergies: allergies || null,
        microchipId: microchipId || null,
      });
      onSuccess();
    } catch {
      setError(t("createError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Required fields */}
      <div className="space-y-2">
        <Label>{t("petName")} *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("speciesLabel")} *</Label>
          <Select value={species} onValueChange={(v) => setSpecies((v ?? "DOG") as typeof species)}>
            <SelectTrigger>
              <SelectValue>{t(`species_${species}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SPECIES.map((s) => (
                <SelectItem key={s} value={s}>{t(`species_${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("sexLabel")} *</Label>
          <Select value={sex} onValueChange={(v) => setSex((v ?? "MALE") as typeof sex)}>
            <SelectTrigger>
              <SelectValue>{t(`sex_${sex}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SEXES.map((s) => (
                <SelectItem key={s} value={s}>{t(`sex_${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("sizeLabel")} *</Label>
          <Select value={size} onValueChange={(v) => setSize((v ?? "MEDIUM") as typeof size)}>
            <SelectTrigger>
              <SelectValue>{t(`size_${size}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>{t(`size_${s}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("colorLabel")} *</Label>
          <Input value={color} onChange={(e) => setColor(e.target.value)} required />
        </div>
      </div>

      {/* Optional fields */}
      <div className="space-y-2">
        <Label>{t("breedLabel")}</Label>
        <Input value={breed} onChange={(e) => setBreed(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("dateOfBirth")}</Label>
          <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("weightKg")}</Label>
          <Input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("allergiesLabel")}</Label>
        <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("microchip")}</Label>
        <Input value={microchipId} onChange={(e) => setMicrochipId(e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        {t("savePet")}
      </Button>
    </form>
  );
}
