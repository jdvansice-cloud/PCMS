"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { updateAppointmentStatus, deleteAppointment } from "../actions";
import type { AppointmentStatus } from "@/generated/prisma/client";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-[var(--status-scheduled)]/10 text-[var(--status-scheduled)]",
  CONFIRMED: "bg-[var(--status-confirmed)]/10 text-[var(--status-confirmed)]",
  IN_PROGRESS: "bg-[var(--status-in-progress)]/10 text-[var(--status-in-progress)]",
  COMPLETED: "bg-[var(--status-completed)]/10 text-[var(--status-completed)]",
  CANCELLED: "bg-[var(--status-cancelled)]/10 text-[var(--status-cancelled)]",
  NO_SHOW: "bg-[var(--status-no-show)]/10 text-[var(--status-no-show)]",
};

type Appointment = {
  id: string;
  type: string;
  status: string;
  scheduledAt: Date;
  durationMin: number;
  reason: string | null;
  notes: string | null;
  owner: { id: string; firstName: string; lastName: string; phone: string | null };
  pet: { id: string; name: string; species: string; breed: string | null };
  vet: { id: string; firstName: string; lastName: string } | null;
  service: { id: string; name: string; durationMin: number } | null;
};

export function AppointmentDetail({
  appointment: a,
  slug,
}: {
  appointment: Appointment;
  slug: string;
}) {
  const router = useRouter();
  const tc = useTranslations("common");
  const ta = useTranslations("appointments");
  const tf = useTranslations("form");
  const tp = useTranslations("pets");
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const base = `/app/${slug}/appointments`;

  async function handleStatusChange(status: string | null) {
    if (!status) return;
    setLoading(true);
    await updateAppointmentStatus(a.id, status as AppointmentStatus);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await deleteAppointment(a.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${ta("title")} - ${a.pet.name}`} backHref={base}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleting(true)}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">{ta("client")}:</span>{" "}
                <Link
                  href={`/app/${slug}/clients/${a.owner.id}`}
                  className="hover:underline font-medium"
                >
                  {a.owner.firstName} {a.owner.lastName}
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">{ta("pet")}:</span>{" "}
                <Link
                  href={`/app/${slug}/pets/${a.pet.id}`}
                  className="hover:underline font-medium"
                >
                  {a.pet.name}
                </Link>{" "}
                ({tp(`speciesLabels.${a.pet.species}`)})
              </div>
              <div>
                <span className="text-muted-foreground">{tc("date")}:</span>{" "}
                {new Date(a.scheduledAt).toLocaleDateString("es-PA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div>
                <span className="text-muted-foreground">{tc("time")}:</span>{" "}
                {new Date(a.scheduledAt).toLocaleTimeString("es-PA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div>
                <span className="text-muted-foreground">{ta("type")}:</span>{" "}
                <Badge variant="secondary">{ta(`typeLabels.${a.type}`)}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{ta("duration")}:</span> {a.durationMin} min
              </div>
              <div>
                <span className="text-muted-foreground">{ta("vet")}:</span>{" "}
                {a.vet ? `${a.vet.firstName} ${a.vet.lastName}` : tf("unassigned")}
              </div>
              <div>
                <span className="text-muted-foreground">{ta("service")}:</span>{" "}
                {a.service?.name ?? "—"}
              </div>
              {a.reason && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">{ta("reason")}:</span> {a.reason}
                </div>
              )}
              {a.notes && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">{tc("notes")}:</span> {a.notes}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-sm">{tc("status")}</h3>
            <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[a.status] ?? ""}`}>
              {ta(`statusLabels.${a.status}`)}
            </Badge>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{tf("changeStatus")}</label>
              <Select value={a.status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue>{ta(`statusLabels.${a.status}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">{ta("statusLabels.SCHEDULED")}</SelectItem>
                  <SelectItem value="CONFIRMED">{ta("statusLabels.CONFIRMED")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{ta("statusLabels.IN_PROGRESS")}</SelectItem>
                  <SelectItem value="COMPLETED">{ta("statusLabels.COMPLETED")}</SelectItem>
                  <SelectItem value="CANCELLED">{ta("statusLabels.CANCELLED")}</SelectItem>
                  <SelectItem value="NO_SHOW">{ta("statusLabels.NO_SHOW")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {a.owner.phone && (
              <div>
                <label className="text-xs text-muted-foreground">{tf("contact")}</label>
                <p className="text-sm">{a.owner.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={tf("deleteAppointment")}
        description={tf("deleteAppointmentConfirm")}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
}
