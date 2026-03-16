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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pets");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const base = `/app/${slug}/pets`;

  return (
    <div className="space-y-6">
      <PageHeader title={t("newPet")}>
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form action={createPet} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("owner")} *</Label>
                <Select name="ownerId" defaultValue={defaultOwnerId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={tf("selectOwner")} />
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
                <Select name="species" defaultValue="DOG">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Input name="breed" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("sex")}</Label>
                <Select name="sex" defaultValue="UNKNOWN">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t("sexLabels.MALE")}</SelectItem>
                    <SelectItem value="FEMALE">{t("sexLabels.FEMALE")}</SelectItem>
                    <SelectItem value="UNKNOWN">{t("sexLabels.UNKNOWN")}</SelectItem>
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
