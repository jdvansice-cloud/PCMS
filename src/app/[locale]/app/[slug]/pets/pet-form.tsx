"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "next-intl";
import { createPet } from "./actions";

type Owner = { id: string; firstName: string; lastName: string };

const SPECIES = ["DOG", "CAT", "BIRD", "REPTILE", "RODENT", "OTHER"] as const;
const SEXES = ["MALE", "FEMALE", "UNKNOWN"] as const;
const SIZES = ["SMALL", "MEDIUM", "LARGE", "XL"] as const;

export function PetForm({
  slug,
  owners,
  defaultOwnerId,
}: {
  slug: string;
  owners: Owner[];
  defaultOwnerId?: string;
}) {
  const t = useTranslations("pets");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const base = `/app/${slug}/pets`;

  const [species, setSpecies] = useState("DOG");
  const [sex, setSex] = useState("UNKNOWN");
  const [size, setSize] = useState("");
  const [ownerId, setOwnerId] = useState(defaultOwnerId || "");

  return (
    <div className="space-y-6">
      <PageHeader title={t("newPet")} backHref={base} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form action={createPet} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("owner")} *</Label>
                <Select name="ownerId" value={ownerId} onValueChange={(v) => v && setOwnerId(v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder={tf("selectOwner")}>
                      {ownerId
                        ? (() => { const o = owners.find((o) => o.id === ownerId); return o ? `${o.firstName} ${o.lastName}` : tf("selectOwner"); })()
                        : tf("selectOwner")}
                    </SelectValue>
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
                <Label>{tc("name")} *</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("species")} *</Label>
                <Select name="species" value={species} onValueChange={(v) => v && setSpecies(v)}>
                  <SelectTrigger>
                    <SelectValue>{t(`speciesLabels.${species}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`speciesLabels.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("breed")}</Label>
                <Input name="breed" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("sex")}</Label>
                <Select name="sex" value={sex} onValueChange={(v) => v && setSex(v)}>
                  <SelectTrigger>
                    <SelectValue>{t(`sexLabels.${sex}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SEXES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`sexLabels.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("dateOfBirth")}</Label>
                <Input name="dateOfBirth" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("weight")}</Label>
                <Input name="weight" type="number" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("size")}</Label>
                <Select name="size" value={size} onValueChange={(v) => v && setSize(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("sizeLabels.selectSize")}>
                      {size ? t(`sizeLabels.${size}`) : t("sizeLabels.selectSize")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`sizeLabels.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("color")}</Label>
                <Input name="color" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("microchip")}</Label>
                <Input name="microchipId" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("allergies")}</Label>
              <Textarea name="allergies" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{tc("notes")}</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">{tc("cancel")}</Button>
              </Link>
              <Button type="submit">{tc("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
