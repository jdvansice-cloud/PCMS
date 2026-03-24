"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getAppointmentDetail } from "../../actions";

type Detail = Awaited<ReturnType<typeof getAppointmentDetail>>;

export default function PortalAppointmentDetailPage() {
  const t = useTranslations("portal.appointments");
  const params = useParams();
  const { organization } = usePortalTenant();
  const [apt, setApt] = useState<Detail>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointmentDetail(params.id as string).then((a) => { setApt(a); setLoading(false); });
  }, [params.id]);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  if (!apt) return <p className="text-muted-foreground">{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <Link
        href={`/portal/${organization.slug}/appointments`}
        className="text-sm text-muted-foreground hover:underline"
      >
        &larr; {t("backToAppointments")}
      </Link>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">
              {apt.service?.name ?? apt.type}
            </h1>
            <Badge variant="outline">{apt.status}</Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">{t("date")}</p>
              <p className="font-medium">
                {new Date(apt.scheduledAt).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {apt.durationMin && (
              <div>
                <p className="text-muted-foreground">{t("duration")}</p>
                <p className="font-medium">{apt.durationMin} min</p>
              </div>
            )}
            {apt.vetName && (
              <div>
                <p className="text-muted-foreground">{t("veterinarian")}</p>
                <p className="font-medium">{apt.vetName}</p>
              </div>
            )}
            {apt.pet && (
              <div>
                <p className="text-muted-foreground">{t("pet")}</p>
                <p className="font-medium">{apt.pet.name}</p>
              </div>
            )}
          </div>

          {apt.reason && (
            <div>
              <p className="text-sm text-muted-foreground">{t("reason")}</p>
              <p className="text-sm">{apt.reason}</p>
            </div>
          )}
          {apt.notes && (
            <div>
              <p className="text-sm text-muted-foreground">{t("notes")}</p>
              <p className="text-sm">{apt.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical record if exists */}
      {apt.medicalRecord && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm mb-3">{t("medicalRecord")}</h2>
            {apt.medicalRecord.diagnosis && (
              <p className="text-sm mb-1"><strong>{t("diagnosis")}:</strong> {apt.medicalRecord.diagnosis}</p>
            )}
            {apt.medicalRecord.prescriptions && apt.medicalRecord.prescriptions.length > 0 && (
              <div className="text-sm mb-1">
                <strong>{t("prescription")}:</strong>
                {apt.medicalRecord.prescriptions.map((p: any, i: number) => (
                  <span key={i}> {p.medicationName} ({p.dosage}){i < apt.medicalRecord!.prescriptions.length - 1 ? "," : ""}</span>
                ))}
              </div>
            )}
            {apt.medicalRecord.notes && (
              <p className="text-sm text-muted-foreground">{apt.medicalRecord.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grooming session if exists */}
      {apt.groomingSession && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm mb-3">{t("groomingDetails")}</h2>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{apt.groomingSession.status}</Badge>
              {apt.groomingSession.completedAt && (
                <span className="text-xs text-muted-foreground">
                  {t("completedAt")}: {new Date(apt.groomingSession.completedAt).toLocaleString()}
                </span>
              )}
            </div>
            {apt.groomingSession.services.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {apt.groomingSession.services.map((s: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
