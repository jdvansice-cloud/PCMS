"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Scissors, Stethoscope, Search, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import {
  checkInScheduledAppointment,
  createWalkInAppointment,
} from "./actions";

type ReceptionData = {
  appointments: {
    id: string;
    type: string;
    scheduledAt: Date | string;
    owner: { id: string; firstName: string; lastName: string; phone: string | null };
    pet: { id: string; name: string; species: string; breed: string | null; size: string | null };
    vet: { id: string; firstName: string; lastName: string } | null;
    service: { id: string; name: string } | null;
  }[];
  owners: {
    id: string;
    firstName: string;
    lastName: string;
    pets: { id: string; name: string; species: string; breed: string | null; size: string | null }[];
  }[];
  kennels: { id: string; name: string; size: string }[];
  groomers: { id: string; firstName: string; lastName: string }[];
  vets: { id: string; firstName: string; lastName: string }[];
  services: { id: string; name: string; type: string; durationMin: number }[];
  branchId: string;
};

type Step = "search" | "type" | "form";

const SIZE_ORDER: Record<string, number> = { SMALL: 1, MEDIUM: 2, LARGE: 3, XL: 4 };

export function ReceptionClient({
  data,
  slug,
}: {
  data: ReceptionData;
  slug: string;
}) {
  const t = useTranslations("reception");
  const tc = useTranslations("common");
  const tg = useTranslations("grooming");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step state
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected scheduled appointment (if checking in)
  const [selectedAppointment, setSelectedAppointment] = useState<
    ReceptionData["appointments"][number] | null
  >(null);

  // Walk-in state
  const [visitType, setVisitType] = useState<"GROOMING" | "CLINIC" | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedVetId, setSelectedVetId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedGroomerId, setSelectedGroomerId] = useState("");
  const [selectedKennelId, setSelectedKennelId] = useState("");
  const [reason, setReason] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [groomingServices, setGroomingServices] = useState<string[]>([]);

  // Derived
  const selectedOwner = data.owners.find((o) => o.id === selectedOwnerId);
  const selectedPet = selectedOwner?.pets.find((p) => p.id === selectedPetId);
  const petSize = selectedPet?.size || "MEDIUM";

  // Filter kennels by pet size (same or larger)
  const compatibleKennels = data.kennels.filter(
    (k) => (SIZE_ORDER[k.size] ?? 0) >= (SIZE_ORDER[petSize] ?? 1)
  );

  // Filter grooming services
  const groomingServiceOptions = data.services.filter(
    (s) => s.type === "GROOMING"
  );
  const clinicServices = data.services.filter((s) => s.type !== "GROOMING");

  // Search filter for scheduled appointments
  const filteredAppointments = data.appointments.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.pet.name.toLowerCase().includes(q) ||
      a.owner.firstName.toLowerCase().includes(q) ||
      a.owner.lastName.toLowerCase().includes(q)
    );
  });

  // -- Handlers ----------------------------------------------------------------

  function handleSelectScheduled(appt: ReceptionData["appointments"][number]) {
    setSelectedAppointment(appt);
    if (appt.type === "GROOMING") {
      setVisitType("GROOMING");
      setStep("form");
    } else {
      setVisitType("CLINIC");
      setStep("form");
    }
  }

  function handleWalkIn() {
    setSelectedAppointment(null);
    setStep("type");
  }

  function handleSelectType(type: "GROOMING" | "CLINIC") {
    setVisitType(type);
    setStep("form");
  }

  function handleBack() {
    if (step === "form") {
      if (selectedAppointment) {
        setStep("search");
        setSelectedAppointment(null);
      } else {
        setStep("type");
      }
    } else if (step === "type") {
      setStep("search");
    }
  }

  function handleCheckIn() {
    startTransition(async () => {
      if (selectedAppointment) {
        // Check in scheduled appointment
        const result = await checkInScheduledAppointment(selectedAppointment.id, {
          kennelId: selectedKennelId || undefined,
          groomerId: selectedGroomerId || undefined,
          petSize: petSize as "SMALL" | "MEDIUM" | "LARGE" | "XL",
          services: groomingServices,
          specialInstructions: specialInstructions || undefined,
        });
        if (result.type === "GROOMING") {
          router.push(`/app/${slug}/grooming`);
        } else {
          router.push(`/app/${slug}/appointments`);
        }
      } else {
        // Walk-in
        const appointmentType =
          visitType === "GROOMING"
            ? "GROOMING"
            : (clinicServices.find((s) => s.id === selectedServiceId)?.type as "CONSULTATION") || "CONSULTATION";
        const result = await createWalkInAppointment({
          type: appointmentType as "GROOMING" | "CONSULTATION" | "VACCINATION" | "SURGERY" | "FOLLOW_UP" | "EMERGENCY" | "OTHER",
          ownerId: selectedOwnerId,
          petId: selectedPetId,
          vetId: selectedVetId || undefined,
          serviceId: selectedServiceId || undefined,
          reason: reason || undefined,
          kennelId: selectedKennelId || undefined,
          groomerId: selectedGroomerId || undefined,
          petSize: petSize as "SMALL" | "MEDIUM" | "LARGE" | "XL",
          groomingServices,
          specialInstructions: specialInstructions || undefined,
        });
        if (result.type === "GROOMING") {
          router.push(`/app/${slug}/grooming`);
        } else {
          router.push(`/app/${slug}/appointments`);
        }
      }
    });
  }

  // -- Render ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      {/* ── Step 1: Search / Select ──────────────────────────────── */}
      {step === "search" && (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Scheduled appointments */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {t("scheduledAppointments")}
            </h2>

            {filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {t("noScheduledToday")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {filteredAppointments.map((appt) => (
                  <Card
                    key={appt.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectScheduled(appt)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-bold">
                            {new Date(appt.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold">{appt.pet.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {appt.owner.firstName} {appt.owner.lastName}
                          </p>
                          {appt.pet.breed && (
                            <p className="text-xs text-muted-foreground">
                              {appt.pet.species} · {appt.pet.breed}
                              {appt.pet.size ? ` · ${appt.pet.size}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={appt.type === "GROOMING" ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {appt.type === "GROOMING" ? (
                            <><Scissors className="h-3 w-3 mr-1" />{t("groomingVisit")}</>
                          ) : (
                            <><Stethoscope className="h-3 w-3 mr-1" />{t("clinicVisit")}</>
                          )}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Walk-in button */}
          <Button onClick={handleWalkIn} className="w-full" size="lg">
            {t("newWalkIn")}
          </Button>
        </>
      )}

      {/* ── Step 2: Choose Type ──────────────────────────────────── */}
      {step === "type" && (
        <>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
          </Button>
          <h2 className="text-lg font-semibold">{t("chooseType")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
              onClick={() => handleSelectType("GROOMING")}
            >
              <CardContent className="p-8 text-center space-y-3">
                <Scissors className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">{t("groomingVisit")}</h3>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
              onClick={() => handleSelectType("CLINIC")}
            >
              <CardContent className="p-8 text-center space-y-3">
                <Stethoscope className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">{t("clinicVisit")}</h3>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Step 3: Form ─────────────────────────────────────────── */}
      {step === "form" && (
        <>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
          </Button>

          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {visitType === "GROOMING" ? (
                  <><Scissors className="h-5 w-5" /> {t("groomingVisit")}</>
                ) : (
                  <><Stethoscope className="h-5 w-5" /> {t("clinicVisit")}</>
                )}
              </h2>

              {/* If scheduled appointment, show info */}
              {selectedAppointment && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium">
                    {selectedAppointment.pet.name} — {selectedAppointment.owner.firstName}{" "}
                    {selectedAppointment.owner.lastName}
                  </p>
                  <p className="text-muted-foreground">
                    {t("scheduled")}:{" "}
                    {new Date(selectedAppointment.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {/* Walk-in: select owner and pet */}
              {!selectedAppointment && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("selectOwner")} *</Label>
                    <Select
                      value={selectedOwnerId}
                      onValueChange={(v) => {
                        setSelectedOwnerId(v ?? "");
                        setSelectedPetId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectOwner")} />
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
                    <Label>{t("selectPet")} *</Label>
                    <Select
                      value={selectedPetId}
                      onValueChange={(v) => setSelectedPetId(v ?? "")}
                      disabled={!selectedOwnerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectPet")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedOwner?.pets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.size ? `(${p.size})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Type-specific fields */}
              {visitType === "GROOMING" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("selectGroomer")}</Label>
                      <Select value={selectedGroomerId} onValueChange={(v) => setSelectedGroomerId(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectGroomer")} />
                        </SelectTrigger>
                        <SelectContent>
                          {data.groomers.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.firstName} {g.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("selectKennel")}</Label>
                      <Select value={selectedKennelId} onValueChange={(v) => setSelectedKennelId(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectKennel")} />
                        </SelectTrigger>
                        <SelectContent>
                          {compatibleKennels.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              {t("noAvailableKennels")}
                            </div>
                          ) : (
                            compatibleKennels.map((k) => (
                              <SelectItem key={k.id} value={k.id}>
                                {k.name} ({k.size})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Grooming services multi-select */}
                  <div className="space-y-1.5">
                    <Label>{tg("services")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {groomingServiceOptions.map((svc) => {
                        const selected = groomingServices.includes(svc.name);
                        return (
                          <Badge
                            key={svc.id}
                            variant={selected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              setGroomingServices((prev) =>
                                selected
                                  ? prev.filter((s) => s !== svc.name)
                                  : [...prev, svc.name]
                              );
                            }}
                          >
                            {svc.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("specialInstructions")}</Label>
                    <Textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {visitType === "CLINIC" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("selectVet")}</Label>
                      <Select value={selectedVetId} onValueChange={(v) => setSelectedVetId(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectVet")} />
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
                      <Label>{t("selectService")}</Label>
                      <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectService")} />
                        </SelectTrigger>
                        <SelectContent>
                          {clinicServices.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.durationMin} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("reason")}</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleBack}>
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={handleCheckIn}
                  disabled={
                    isPending ||
                    (!selectedAppointment && (!selectedOwnerId || !selectedPetId))
                  }
                >
                  {isPending ? tc("loading") : t("checkIn")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
