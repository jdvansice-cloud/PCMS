"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import {
  type PublicOrgData,
  getAvailableDatesAction,
  createPublicBooking,
} from "./actions";

const TOTAL_STEPS = 5;

type DateSlot = {
  date: string;
  available: boolean;
  remaining: number;
  closed: boolean;
};

export function BookingForm({
  orgData,
  slug,
}: {
  orgData: PublicOrgData;
  slug: string;
}) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step tracking
  const [step, setStep] = useState(1);

  // Step 1: Owner info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Pet info
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"DOG" | "CAT">("DOG");
  const [breed, setBreed] = useState("");
  const [petSize, setPetSize] = useState<"SMALL" | "MEDIUM" | "LARGE">(
    "MEDIUM",
  );

  // Step 3: Services
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [needsPickup, setNeedsPickup] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");

  // Step 4: Date
  const [availableDates, setAvailableDates] = useState<DateSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);

  // Step 5: Error
  const [submitError, setSubmitError] = useState("");

  // Load available dates when entering step 4
  useEffect(() => {
    if (step === 4) {
      setLoadingDates(true);
      getAvailableDatesAction(slug, petSize).then((dates) => {
        setAvailableDates(dates);
        setLoadingDates(false);

        // Find next available if currently selected date is full
        if (selectedDate) {
          const selected = dates.find((d) => d.date === selectedDate);
          if (selected && !selected.available) {
            const next = dates.find(
              (d) => d.available && d.date > selectedDate,
            );
            setNextAvailable(next?.date ?? null);
          }
        }
      });
    }
  }, [step, slug, petSize, selectedDate]);

  function canGoNext(): boolean {
    switch (step) {
      case 1:
        return (
          firstName.trim() !== "" &&
          lastName.trim() !== "" &&
          email.trim() !== "" &&
          phone.trim() !== ""
        );
      case 2:
        return petName.trim() !== "" && !!petSize;
      case 3:
        return (
          selectedServiceIds.length > 0 &&
          (!needsPickup || pickupAddress.trim() !== "")
        );
      case 4:
        return selectedDate !== "";
      default:
        return true;
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function handleSubmit() {
    setSubmitError("");
    startTransition(async () => {
      const result = await createPublicBooking(slug, {
        firstName,
        lastName,
        email,
        phone,
        petName,
        species,
        breed,
        petSize,
        serviceIds: selectedServiceIds,
        needsPickup,
        pickupAddress: needsPickup ? pickupAddress : "",
        date: selectedDate,
      });

      if (result.success) {
        router.push(`/book/${slug}/confirmation`);
      } else {
        setSubmitError(result.error ?? t("bookingError"));
      }
    });
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  }

  const selectedServices = orgData.services.filter((s) =>
    selectedServiceIds.includes(s.id),
  );

  // Format date for display
  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    return new Intl.DateTimeFormat("es-PA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(d);
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-2 w-10 rounded-full transition-colors ${
              s === step
                ? "bg-[var(--brand-primary)]"
                : s < step
                  ? "bg-[var(--brand-primary)]/60"
                  : "bg-gray-200"
            }`}
          />
        ))}
        <span className="ml-3 text-sm text-muted-foreground">
          {step}/{TOTAL_STEPS}
        </span>
      </div>

      {/* Step 1: Owner Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepOwnerInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("firstName")}</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("lastName")}</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("lastNamePlaceholder")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                required
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Pet Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepPetInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="petName">{t("petName")}</Label>
              <Input
                id="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder={t("petNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("species")}</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="species"
                    value="DOG"
                    checked={species === "DOG"}
                    onChange={() => setSpecies("DOG")}
                    className="accent-[var(--brand-primary)]"
                  />
                  {t("dog")}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="species"
                    value="CAT"
                    checked={species === "CAT"}
                    onChange={() => setSpecies("CAT")}
                    className="accent-[var(--brand-primary)]"
                  />
                  {t("cat")}
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">{t("breed")}</Label>
              <Input
                id="breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder={t("breedPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("petSize")}</Label>
              <div className="grid grid-cols-3 gap-3">
                {(["SMALL", "MEDIUM", "LARGE"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPetSize(size)}
                    className={`rounded-lg border-2 p-3 text-center transition-colors ${
                      petSize === size
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">
                      {size === "SMALL"
                        ? t("sizeSmall")
                        : size === "MEDIUM"
                          ? t("sizeMedium")
                          : t("sizeLarge")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {size === "SMALL"
                        ? t("sizeSmallDesc")
                        : size === "MEDIUM"
                          ? t("sizeMediumDesc")
                          : t("sizeLargeDesc")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Services */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepServices")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {orgData.services.map((service) => (
                <label
                  key={service.id}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                    selectedServiceIds.includes(service.id)
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Checkbox
                    checked={selectedServiceIds.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    {service.description && (
                      <div className="text-sm text-muted-foreground">
                        {service.description}
                      </div>
                    )}
                  </div>
                  <div className="font-semibold">
                    ${service.price.toFixed(2)}
                  </div>
                </label>
              ))}
            </div>

            {/* Pickup toggle */}
            <div className="border-t pt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={needsPickup}
                  onCheckedChange={(checked) =>
                    setNeedsPickup(checked === true)
                  }
                />
                <span className="font-medium">{t("needsPickup")}</span>
              </label>
              {needsPickup && (
                <div className="space-y-2 pl-7">
                  <Label htmlFor="pickupAddress">{t("pickupAddress")}</Label>
                  <Input
                    id="pickupAddress"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder={t("pickupAddressPlaceholder")}
                    required
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Pick a Date */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepPickDate")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {availableDates.map((slot) => {
                    const isSelected = selectedDate === slot.date;
                    const isClosed = slot.closed;
                    const isFull = !slot.available && !isClosed;

                    return (
                      <button
                        key={slot.date}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => {
                          setSelectedDate(slot.date);
                          setNextAvailable(null);
                        }}
                        className={`rounded-lg p-2 text-center text-sm transition-colors ${
                          isSelected
                            ? "bg-[var(--brand-primary)] text-white"
                            : slot.available
                              ? "bg-green-50 border border-green-200 text-green-800 hover:bg-green-100"
                              : isFull
                                ? "bg-red-50 border border-red-200 text-red-400 cursor-not-allowed"
                                : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <div className="font-medium">
                          {new Date(slot.date + "T12:00:00").getDate()}
                        </div>
                        <div className="text-xs">
                          {new Intl.DateTimeFormat("es-PA", {
                            weekday: "short",
                          }).format(new Date(slot.date + "T12:00:00"))}
                        </div>
                        {slot.available && (
                          <div className="text-xs mt-1">
                            {slot.remaining} {t("slotsAvailable")}
                          </div>
                        )}
                        {isFull && (
                          <div className="text-xs mt-1">{t("full")}</div>
                        )}
                        {isClosed && (
                          <div className="text-xs mt-1">{t("closed")}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Next available link */}
                {nextAvailable && (
                  <p className="text-sm text-muted-foreground">
                    {t("nextAvailable")}:{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(nextAvailable);
                        setNextAvailable(null);
                      }}
                      className="text-[var(--brand-primary)] underline font-medium"
                    >
                      {formatDate(nextAvailable)}
                    </button>
                  </p>
                )}

                {selectedDate && (
                  <p className="text-sm font-medium">
                    {t("selectedDate")}: {formatDate(selectedDate)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirm */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("stepConfirm")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("name")}</span>
                <span className="font-medium">
                  {firstName} {lastName}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("email")}</span>
                <span className="font-medium">{email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("phone")}</span>
                <span className="font-medium">{phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("pet")}</span>
                <span className="font-medium">
                  {petName} ({species === "DOG" ? t("dog") : t("cat")})
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("petSize")}</span>
                <span className="font-medium">
                  {petSize === "SMALL"
                    ? t("sizeSmall")
                    : petSize === "MEDIUM"
                      ? t("sizeMedium")
                      : t("sizeLarge")}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  {t("servicesLabel")}
                </span>
                <span className="font-medium text-right">
                  {selectedServices.map((s) => s.name).join(", ")}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("total")}</span>
                <span className="font-bold">
                  $
                  {selectedServices
                    .reduce((sum, s) => sum + s.price, 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t("date")}</span>
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </div>
              {needsPickup && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">
                    {t("pickupAddress")}
                  </span>
                  <span className="font-medium text-right">
                    {pickupAddress}
                  </span>
                </div>
              )}
            </div>

            {submitError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {submitError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={handleBack} disabled={isPending}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={!canGoNext()}>
            {t("next")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("confirmBooking")}
          </Button>
        )}
      </div>
    </div>
  );
}
