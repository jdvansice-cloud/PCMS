"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { createAppointment } from "./actions";

type FormData = {
  owners: {
    id: string;
    firstName: string;
    lastName: string;
    pets: { id: string; name: string }[];
  }[];
  vets: { id: string; firstName: string; lastName: string }[];
  services: { id: string; name: string; type: string; durationMin: number }[];
  branchId: string;
};

export function AppointmentForm({ data, slug }: { data: FormData; slug: string }) {
  const t = useTranslations("appointments");
  const tc = useTranslations("common");
  const base = `/app/${slug}/appointments`;
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedVetId, setSelectedVetId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedType, setSelectedType] = useState("CONSULTATION");

  const selectedOwner = data.owners.find((o) => o.id === selectedOwnerId);
  const selectedPet = selectedOwner?.pets.find((p) => p.id === selectedPetId);
  const selectedVet = data.vets.find((v) => v.id === selectedVetId);
  const selectedService = data.services.find((s) => s.id === selectedServiceId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("newAppointment")} backHref={base} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form action={createAppointment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("client")} *</Label>
                <Select
                  name="ownerId"
                  value={selectedOwnerId}
                  onValueChange={(v) => { if (v) { setSelectedOwnerId(v); setSelectedPetId(""); } }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectClient")}>
                      {selectedOwner
                        ? `${selectedOwner.firstName} ${selectedOwner.lastName}`
                        : t("selectClient")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {data.owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.firstName} {o.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("pet")} *</Label>
                <Select name="petId" value={selectedPetId} onValueChange={(v) => v && setSelectedPetId(v)} required disabled={!selectedOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectPet")}>
                      {selectedPet ? selectedPet.name : t("selectPet")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOwner?.pets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("vet")}</Label>
                <Select name="vetId" value={selectedVetId} onValueChange={(v) => v && setSelectedVetId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectVet")}>
                      {selectedVet ? `${selectedVet.firstName} ${selectedVet.lastName}` : t("selectVet")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {data.vets.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.firstName} {v.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("service")}</Label>
                <Select
                  name="serviceId"
                  value={selectedServiceId}
                  onValueChange={(v) => {
                    if (v) {
                      setSelectedServiceId(v);
                      const svc = data.services.find((s) => s.id === v);
                      if (svc) setSelectedType(svc.type);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectService")}>
                      {selectedService
                        ? `${selectedService.name} (${selectedService.durationMin} min)`
                        : t("selectService")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {data.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.durationMin} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("type")} *</Label>
                <Select name="type" value={selectedType} onValueChange={(v) => v && setSelectedType(v)}>
                  <SelectTrigger>
                    <SelectValue>{t(`typeLabels.${selectedType}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">{t("typeLabels.CONSULTATION")}</SelectItem>
                    <SelectItem value="VACCINATION">{t("typeLabels.VACCINATION")}</SelectItem>
                    <SelectItem value="SURGERY">{t("typeLabels.SURGERY")}</SelectItem>
                    <SelectItem value="FOLLOW_UP">{t("typeLabels.FOLLOW_UP")}</SelectItem>
                    <SelectItem value="EMERGENCY">{t("typeLabels.EMERGENCY")}</SelectItem>
                    <SelectItem value="OTHER">{t("typeLabels.OTHER")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("scheduledAt")} *</Label>
                <Input name="scheduledAt" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("duration")}</Label>
                <Input
                  name="durationMin"
                  type="number"
                  defaultValue={selectedService?.durationMin ?? 30}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("reason")}</Label>
              <Textarea name="reason" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{tc("notes")}</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">
                  {tc("cancel")}
                </Button>
              </Link>
              <Button type="submit">{tc("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
