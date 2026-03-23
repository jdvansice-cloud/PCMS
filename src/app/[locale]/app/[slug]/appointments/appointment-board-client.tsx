"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Plus, Scissors, Stethoscope } from "lucide-react";
import {
  getAppointmentBoard,
  getKennelOccupancyAll,
  updateAppointmentStatus,
  assignKennelToAppointment,
  releaseKennelFromAppointment,
  markAppointmentPickedUp,
} from "./actions";
import { PageHeader } from "@/components/page-header";
import { useFormatDate } from "@/lib/use-format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type BoardData = Awaited<ReturnType<typeof getAppointmentBoard>>;
type Appointment = BoardData["appointments"][number];
type KennelOccupancy = Awaited<ReturnType<typeof getKennelOccupancyAll>>;

type Props = {
  initialData: BoardData;
  initialDate: string;
  slug: string;
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
const STATUS_COLS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const;

function statusColor(status: string) {
  switch (status) {
    case "SCHEDULED":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-300";
    case "CONFIRMED":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-300";
    case "IN_PROGRESS":
      return "bg-blue-500/15 text-blue-700 border-blue-300";
    case "COMPLETED":
      return "bg-green-500/15 text-green-700 border-green-300";
    case "CANCELLED":
      return "bg-red-500/15 text-red-700 border-red-300";
    default:
      return "";
  }
}

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "IN_PROGRESS":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

const SIZE_ORDER: Record<string, number> = { SMALL: 1, MEDIUM: 2, LARGE: 3, XL: 4 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AppointmentBoardClient({ initialData, initialDate, slug }: Props) {
  const t = useTranslations("appointments");
  const tc = useTranslations("common");
  const { formatTime } = useFormatDate();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<BoardData>(initialData);
  const [kennelOccupancy, setKennelOccupancy] = useState<KennelOccupancy | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // -- Refresh ---------------------------------------------------------------
  const refreshBoard = useCallback(
    (targetDate?: string) => {
      const d = targetDate ?? date;
      startTransition(async () => {
        const [newData, occupancy] = await Promise.all([
          getAppointmentBoard(d),
          getKennelOccupancyAll(d),
        ]);
        setData(newData);
        setKennelOccupancy(occupancy);
      });
    },
    [date]
  );

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    refreshBoard(newDate);
  };

  useEffect(() => {
    if (kennelOccupancy === null) {
      startTransition(async () => {
        const occ = await getKennelOccupancyAll(date);
        setKennelOccupancy(occ);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Group appointments by status ------------------------------------------
  const grouped: Record<string, Appointment[]> = {
    SCHEDULED: [],
    IN_PROGRESS: [],
    COMPLETED: [],
  };
  for (const a of data.appointments) {
    if (a.status === "CONFIRMED") {
      grouped["SCHEDULED"].push(a);
    } else if (grouped[a.status]) {
      grouped[a.status].push(a);
    }
  }

  // -- Available kennels for the selected appointment's petSize ---------------
  const selectedPetSize = selectedAppt?.pet.size || "MEDIUM";
  const minOrder = SIZE_ORDER[selectedPetSize] ?? 1;
  const occupiedKennelIds = new Set<string>();
  if (kennelOccupancy) {
    for (const k of kennelOccupancy) {
      if (k.groomingSessions.length > 0 || k.appointments.length > 0) {
        occupiedKennelIds.add(k.id);
      }
    }
  }
  const availableKennels = (kennelOccupancy ?? []).filter(
    (k) => !occupiedKennelIds.has(k.id) && (SIZE_ORDER[k.size] ?? 0) >= minOrder
  );

  // -- Kennel occupancy grouped by size --------------------------------------
  const kennelsBySize: Record<string, KennelOccupancy> = {};
  if (kennelOccupancy) {
    for (const k of kennelOccupancy) {
      const key = k.size as string;
      if (!kennelsBySize[key]) kennelsBySize[key] = [];
      kennelsBySize[key].push(k);
    }
  }

  // -- Handlers --------------------------------------------------------------
  const openDetail = (appt: Appointment) => {
    setSelectedAppt(appt);
    setDialogOpen(true);
  };

  const handleStatusChange = (newStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED") => {
    if (!selectedAppt) return;
    startTransition(async () => {
      await updateAppointmentStatus(selectedAppt.id, newStatus);
      refreshBoard();
      setDialogOpen(false);
      setSelectedAppt(null);
    });
  };

  const handleAssignKennel = (kennelId: string | null) => {
    if (!kennelId || !selectedAppt) return;
    startTransition(async () => {
      await assignKennelToAppointment(selectedAppt.id, kennelId);
      refreshBoard();
      setDialogOpen(false);
      setSelectedAppt(null);
    });
  };

  const handleReleaseKennel = () => {
    if (!selectedAppt) return;
    startTransition(async () => {
      await releaseKennelFromAppointment(selectedAppt.id);
      refreshBoard();
      setDialogOpen(false);
      setSelectedAppt(null);
    });
  };

  const handlePickedUp = (appt: Appointment) => {
    startTransition(async () => {
      await markAppointmentPickedUp(appt.id);
      refreshBoard();
    });
  };

  function getNextStatus(current: string): "IN_PROGRESS" | "COMPLETED" | null {
    if (current === "SCHEDULED" || current === "CONFIRMED") return "IN_PROGRESS";
    if (current === "IN_PROGRESS") return "COMPLETED";
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("boardDescription")}>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-44"
          />
          <Link href={`/app/${slug}/appointments/new`}>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("newAppointment")}
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* -- Kanban Columns ------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STATUS_COLS.map((status) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={statusBadgeVariant(status)}
                className={statusColor(status)}
              >
                {t(`statusLabels.${status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({grouped[status].length})
              </span>
            </div>

            <div className="space-y-2 min-h-[120px] rounded-lg border border-dashed border-border p-2">
              {grouped[status].length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("noAppointments")}
                </p>
              )}
              {grouped[status].map((appt) => (
                <Card
                  key={appt.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => openDetail(appt)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{appt.pet.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {t(`typeLabels.${appt.type}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {appt.owner.firstName} {appt.owner.lastName}
                    </p>
                    {appt.service && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {appt.service.name}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {appt.kennel
                          ? `${appt.kennel.name} (${appt.kennel.size})`
                          : t("noKennel")}
                      </span>
                      <span>
                        {appt.vet
                          ? `${appt.vet.firstName} ${appt.vet.lastName}`
                          : t("noVet")}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatTime(appt.scheduledAt)}
                      {appt.reason && ` · ${appt.reason}`}
                    </div>
                    {/* Picked-up button for completed */}
                    {status === "COMPLETED" && !appt.pickedUpAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickedUp(appt);
                        }}
                        disabled={isPending}
                      >
                        {t("markPickedUp")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* -- Detail Dialog -------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedAppt && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedAppt.pet.name} &mdash;{" "}
                  <Badge
                    variant={statusBadgeVariant(selectedAppt.status)}
                    className={statusColor(selectedAppt.status)}
                  >
                    {t(`statusLabels.${selectedAppt.status}`)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">{t("client")}:</span>{" "}
                    {selectedAppt.owner.firstName} {selectedAppt.owner.lastName}
                    {selectedAppt.owner.phone && ` · ${selectedAppt.owner.phone}`}
                  </p>
                  <p>
                    <span className="font-medium">{t("type")}:</span>{" "}
                    {t(`typeLabels.${selectedAppt.type}`)}
                  </p>
                  {selectedAppt.service && (
                    <p>
                      <span className="font-medium">{t("service")}:</span>{" "}
                      {selectedAppt.service.name} ({selectedAppt.service.durationMin} min)
                    </p>
                  )}
                  <p>
                    <span className="font-medium">{t("vet")}:</span>{" "}
                    {selectedAppt.vet
                      ? `${selectedAppt.vet.firstName} ${selectedAppt.vet.lastName}`
                      : "—"}
                  </p>
                  {selectedAppt.reason && (
                    <p>
                      <span className="font-medium">{t("reason")}:</span>{" "}
                      {selectedAppt.reason}
                    </p>
                  )}
                </div>

                {/* Kennel select */}
                <div className="space-y-1.5">
                  <Label>{t("kennel")}</Label>
                  {selectedAppt.kennelId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {selectedAppt.kennel?.name} ({selectedAppt.kennel?.size})
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReleaseKennel}
                        disabled={isPending}
                      >
                        {t("releaseKennel")}
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value=""
                      onValueChange={handleAssignKennel}
                      disabled={isPending || availableKennels.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectKennel")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableKennels.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.name} ({k.size})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <DialogFooter>
                {(() => {
                  const next = getNextStatus(selectedAppt.status);
                  if (!next) return null;
                  return (
                    <Button
                      onClick={() => handleStatusChange(next)}
                      disabled={isPending}
                    >
                      {t(`moveTo.${next}`)}
                    </Button>
                  );
                })()}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* -- Kennel Occupancy ----------------------------------------------- */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("kennelOccupancy")}</h2>
        {Object.keys(kennelsBySize).length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noKennels")}</p>
        )}
        {Object.entries(kennelsBySize).map(([size, kennels]) => (
          <div key={size} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{size}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {kennels.map((kennel) => {
                const groomingOccupant =
                  kennel.groomingSessions.length > 0 ? kennel.groomingSessions[0] : null;
                const clinicOccupant =
                  kennel.appointments.length > 0 ? kennel.appointments[0] : null;
                const occupied = groomingOccupant || clinicOccupant;

                return (
                  <Card
                    key={kennel.id}
                    className={
                      groomingOccupant
                        ? "border-purple-300 bg-purple-50"
                        : clinicOccupant
                        ? "border-blue-300 bg-blue-50"
                        : "border-green-300 bg-green-50"
                    }
                  >
                    <CardContent className="p-2 text-center">
                      <p className="text-xs font-semibold">{kennel.name}</p>
                      {occupied ? (
                        <>
                          <p className="text-[10px] text-muted-foreground">
                            {groomingOccupant
                              ? groomingOccupant.pet.name
                              : clinicOccupant!.pet.name}
                          </p>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            {groomingOccupant ? (
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 gap-0.5">
                                <Scissors className="h-2.5 w-2.5" />
                                {t("typeLabels.GROOMING")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 gap-0.5">
                                <Stethoscope className="h-2.5 w-2.5" />
                                {t("clinic")}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          {t("empty")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
