"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getPetDetail } from "../../actions";
import { PawPrint, Syringe, Stethoscope } from "lucide-react";
import Link from "next/link";

type PetData = Awaited<ReturnType<typeof getPetDetail>>;

export default function PortalPetDetailPage() {
  const t = useTranslations("portal.pets");
  const params = useParams();
  const { organization } = usePortalTenant();
  const [pet, setPet] = useState<PetData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPetDetail(params.petId as string).then((p) => { setPet(p); setLoading(false); });
  }, [params.petId]);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  if (!pet) return <p className="text-muted-foreground">{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <Link
        href={`/portal/${organization.slug}/pets`}
        className="text-sm text-muted-foreground hover:underline"
      >
        &larr; {t("backToPets")}
      </Link>

      {/* Pet info */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          {pet.photoUrl ? (
            <img src={pet.photoUrl} alt={pet.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <PawPrint className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{pet.name}</h1>
            <p className="text-muted-foreground">{pet.breed ?? pet.species}</p>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline">{pet.species}</Badge>
              {pet.size && <Badge variant="secondary">{pet.size}</Badge>}
              {pet.sex && <Badge variant="secondary">{pet.sex}</Badge>}
            </div>
            {pet.allergies && (
              <p className="text-xs text-destructive mt-1">{t("allergies")}: {pet.allergies}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vaccinations */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Syringe className="h-4 w-4" /> {t("vaccinations")}
          </h2>
          {pet.vaccinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noVaccinations")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("vaccine")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("nextDue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pet.vaccinations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.vaccineName}</TableCell>
                    <TableCell>{new Date(v.administeredAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {v.nextDueDate ? (
                        <span className={new Date(v.nextDueDate) < new Date() ? "text-destructive" : ""}>
                          {new Date(v.nextDueDate).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Medical Records */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> {t("medicalRecords")}
          </h2>
          {pet.medicalRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRecords")}</p>
          ) : (
            <div className="space-y-3">
              {pet.medicalRecords.map((r) => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">
                      {r.appointment?.serviceName ?? r.appointment?.type ?? t("visit")}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.diagnosis && (
                    <p className="text-sm"><strong>{t("diagnosis")}:</strong> {r.diagnosis}</p>
                  )}
                  {r.prescriptions && r.prescriptions.length > 0 && (
                    <div className="text-sm">
                      <strong>{t("prescription")}:</strong>
                      {r.prescriptions.map((p: any, i: number) => (
                        <span key={i}> {p.medicationName} ({p.dosage}){i < r.prescriptions.length - 1 ? "," : ""}</span>
                      ))}
                    </div>
                  )}
                  {r.notes && (
                    <p className="text-sm text-muted-foreground">{r.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
