"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  getGroomingBoard,
  getGroomers,
  assignKennel,
  releaseKennel,
  assignGroomer,
  updateGroomingStatus,
  getKennelOccupancy,
  markGroomingPickedUp,
  getGroomingFormData,
  createGroomingAppointment,
  getScheduledGroomingAppointments,
} from "./actions";
import { PageHeader } from "@/components/page-header";
import { useFormatDate } from "@/lib/use-format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Clock, Scissors, Stethoscope } from "lucide-react";

// ---------------------------------------------------------------------------
// Types inferred from server actions
// ---------------------------------------------------------------------------
type BoardData = Awaited<ReturnType<typeof getGroomingBoard>>;
type GroomerList = Awaited<ReturnType<typeof getGroomers>>;
type Session = BoardData["sessions"][number];
type KennelOccupancy = Awaited<ReturnType<typeof getKennelOccupancy>>;
type FormData = Awaited<ReturnType<typeof getGroomingFormData>>;
type ScheduledAppointment = Awaited<ReturnType<typeof getScheduledGroomingAppointments>>[number];

type Props = {
  initialData: BoardData;
  initialGroomers: GroomerList;
  initialFormData: FormData;
  initialScheduled: ScheduledAppointment[];
  initialDate: string;
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------
const STATUS_COLS = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

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

function statusColor(status: string) {
  switch (status) {
    case "PENDING":
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const SIZE_ORDER_CONST: Record<string, number> = { SMALL: 1, MEDIUM: 2, LARGE: 3, XL: 4 };

export function GroomingBoardClient({
  initialData,
  initialGroomers,
  initialFormData,
  initialScheduled,
  initialDate,
}: Props) {
  const t = useTranslations("grooming");
  const tc = useTranslations("common");
  const tp = useTranslations("pets");
  const { formatTime, formatDate, formatDateTime } = useFormatDate();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<BoardData>(initialData);
  const [groomers] = useState<GroomerList>(initialGroomers);
  const [formData] = useState<FormData>(initialFormData);
  const [scheduled, setScheduled] = useState<ScheduledAppointment[]>(initialScheduled);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [pendingCompleteSession, setPendingCompleteSession] = useState<Session | null>(null);
  const [kennelOccupancy, setKennelOccupancy] =
    useState<KennelOccupancy | null>(null);

  // -- New appointment dialog state ------------------------------------------
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [newPetId, setNewPetId] = useState("");
  const [newDate, setNewDate] = useState(date);
  const [newTime, setNewTime] = useState("09:00");
  const [newGroomerId, setNewGroomerId] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  const [newInstructions, setNewInstructions] = useState("");

  const newOwner = formData.owners.find((o) => o.id === newOwnerId);
  const newPet = newOwner?.pets.find((p) => p.id === newPetId);
  const newPetSize = newPet?.size || "MEDIUM";

  // Filter services by pet size
  const availableNewServices = formData.services.filter(
    (s) => s.petSizes.length === 0 || s.petSizes.includes(newPetSize)
  );


  // -- Refresh board data ---------------------------------------------------
  const refreshBoard = useCallback(
    (targetDate?: string) => {
      const d = targetDate ?? date;
      startTransition(async () => {
        const [newData, occupancy] = await Promise.all([
          getGroomingBoard(d),
          getKennelOccupancy(d),
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

  // -- Initial occupancy load -----------------------------------------------
  useEffect(() => {
    if (kennelOccupancy === null) {
      startTransition(async () => {
        const occ = await getKennelOccupancy(date);
        setKennelOccupancy(occ);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Group sessions by status ---------------------------------------------
  const grouped: Record<string, Session[]> = {
    PENDING: [],
    IN_PROGRESS: [],
    COMPLETED: [],
  };
  for (const s of data.sessions) {
    if (grouped[s.status]) {
      grouped[s.status].push(s);
    }
  }

  // -- Dialog actions -------------------------------------------------------
  const handleAssignGroomer = (groomerId: string | null) => {
    if (!groomerId) return;
    if (!selectedSession) return;
    startTransition(async () => {
      await assignGroomer(selectedSession.id, groomerId);
      refreshBoard();
      setDialogOpen(false);
      setSelectedSession(null);
    });
  };

  const handleAssignKennel = (kennelId: string | null) => {
    if (!kennelId) return;
    if (!selectedSession) return;
    startTransition(async () => {
      await assignKennel(selectedSession.id, kennelId);
      refreshBoard();
      setDialogOpen(false);
      setSelectedSession(null);
    });
  };

  const handleReleaseKennel = () => {
    if (!selectedSession) return;
    startTransition(async () => {
      await releaseKennel(selectedSession.id);
      refreshBoard();
      setDialogOpen(false);
      setSelectedSession(null);
    });
  };

  const handleStatusChange = (
    newStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  ) => {
    if (!selectedSession) return;
    if (newStatus === "COMPLETED") {
      setPendingCompleteSession(selectedSession);
      setConfirmCompleteOpen(true);
      return;
    }
    startTransition(async () => {
      await updateGroomingStatus(selectedSession.id, newStatus);
      refreshBoard();
      setDialogOpen(false);
      setSelectedSession(null);
    });
  };

  const handleConfirmComplete = () => {
    if (!pendingCompleteSession) return;
    startTransition(async () => {
      await updateGroomingStatus(pendingCompleteSession.id, "COMPLETED");
      refreshBoard();
      setConfirmCompleteOpen(false);
      setPendingCompleteSession(null);
      setDialogOpen(false);
      setSelectedSession(null);
    });
  };

  const handlePickedUp = (session: Session) => {
    startTransition(async () => {
      await markGroomingPickedUp(session.id);
      refreshBoard();
    });
  };

  const openDetail = (session: Session) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  // -- New appointment handlers -----------------------------------------------
  const resetNewApptForm = () => {
    setNewOwnerId("");
    setNewPetId("");
    setNewDate(date);
    setNewTime("09:00");
    setNewGroomerId("");
    setNewServices([]);
    setNewInstructions("");
  };

  const handleCreateAppointment = () => {
    if (!newOwnerId || !newPetId || newServices.length === 0) return;
    startTransition(async () => {
      await createGroomingAppointment({
        ownerId: newOwnerId,
        petId: newPetId,
        scheduledAt: `${newDate}T${newTime}:00`,
        groomerId: newGroomerId || undefined,
        services: newServices,
        specialInstructions: newInstructions || undefined,
        petSize: newPetSize,
      });
      setNewApptOpen(false);
      resetNewApptForm();
      // Refresh board and scheduled list
      const [newData, newScheduled] = await Promise.all([
        getGroomingBoard(date),
        getScheduledGroomingAppointments(),
      ]);
      setData(newData);
      setScheduled(newScheduled);
    });
  };

  const toggleNewService = (name: string) => {
    setNewServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  // -- Available kennels for the selected session's petSize (same size or larger)
  const SIZE_ORDER: Record<string, number> = { SMALL: 1, MEDIUM: 2, LARGE: 3, XL: 4 };
  const availableKennelsForSession = (() => {
    if (!selectedSession?.petSize) return [];
    const minOrder = SIZE_ORDER[selectedSession.petSize] ?? 1;
    return (data.freeKennels ?? []).filter(
      (k) => (SIZE_ORDER[k.size] ?? 0) >= minOrder
    );
  })();

  // -- Kennel occupancy grouped by size -------------------------------------
  const kennelsBySize: Record<string, KennelOccupancy> = {};
  if (kennelOccupancy) {
    for (const k of kennelOccupancy) {
      const key = k.size as string;
      if (!kennelsBySize[key]) kennelsBySize[key] = [];
      kennelsBySize[key].push(k);
    }
  }

  // -- Next status ----------------------------------------------------------
  function getNextStatus(
    current: string
  ): "IN_PROGRESS" | "COMPLETED" | null {
    if (current === "PENDING") return "IN_PROGRESS";
    if (current === "IN_PROGRESS") return "COMPLETED";
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-44"
          />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              resetNewApptForm();
              setNewApptOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> {t("newAppointment")}
          </Button>
        </div>
      </PageHeader>

      {/* ── Kanban Columns ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STATUS_COLS.map((status) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={statusBadgeVariant(status)}
                className={statusColor(status)}
              >
                {t(`status.${status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({grouped[status].length})
              </span>
            </div>

            <div className="space-y-2 min-h-[120px] rounded-lg border border-dashed border-border p-2">
              {grouped[status].length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("noSessions")}
                </p>
              )}
              {grouped[status].map((session) => (
                <Card
                  key={session.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => openDetail(session)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {session.pet.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {session.petSize && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {session.petSize}
                          </Badge>
                        )}
                        {session.appointment?.groomingPickup && (
                          <span title={t("pickup")} className="text-base">
                            {"\uD83D\uDE90"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.pet.owner.firstName}{" "}
                      {session.pet.owner.lastName}
                    </p>
                    {/* Pet details */}
                    <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                      {session.pet.species && <span>{session.pet.species}</span>}
                      {session.pet.breed && <span>· {session.pet.breed}</span>}
                      {session.pet.color && <span>· {session.pet.color}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {session.services.map((svc) => (
                        <Badge
                          key={svc}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {svc}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {session.kennel
                          ? `${session.kennel.name} (${session.kennel.size})`
                          : t("noCage")}
                      </span>
                      <span>
                        {session.groomer
                          ? `${session.groomer.firstName} ${session.groomer.lastName}`
                          : t("noGroomer")}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {t("scheduledTime")}: {formatTime(session.scheduledAt)}
                    </div>
                    {/* Picked-up button for completed sessions */}
                    {status === "COMPLETED" && !session.pickedUpAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickedUp(session);
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

      {/* ── Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedSession.pet.name} &mdash;{" "}
                  <Badge
                    variant={statusBadgeVariant(selectedSession.status)}
                    className={statusColor(selectedSession.status)}
                  >
                    {t(`status.${selectedSession.status}`)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Read-only info */}
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">{t("owner")}:</span>{" "}
                    {selectedSession.pet.owner.firstName}{" "}
                    {selectedSession.pet.owner.lastName}
                  </p>
                  <p>
                    <span className="font-medium">{t("services")}:</span>{" "}
                    {selectedSession.services.join(", ")}
                  </p>
                  {selectedSession.specialInstructions && (
                    <p>
                      <span className="font-medium">
                        {t("specialInstructions")}:
                      </span>{" "}
                      {selectedSession.specialInstructions}
                    </p>
                  )}
                  {selectedSession.notes && (
                    <p>
                      <span className="font-medium">{t("notes")}:</span>{" "}
                      {selectedSession.notes}
                    </p>
                  )}
                </div>

                {/* Groomer select */}
                <div className="space-y-1.5">
                  <Label>{t("groomer")}</Label>
                  <Select
                    value={selectedSession.groomer?.id ?? ""}
                    onValueChange={handleAssignGroomer}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectGroomer")}>
                        {selectedSession.groomer
                          ? `${selectedSession.groomer.firstName} ${selectedSession.groomer.lastName}`
                          : t("selectGroomer")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {groomers.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.firstName} {g.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cage select */}
                <div className="space-y-1.5">
                  <Label>{t("cage")}</Label>
                  {selectedSession.kennelId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {selectedSession.kennel?.name} (
                        {selectedSession.kennel?.size})
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReleaseKennel}
                        disabled={isPending}
                      >
                        {t("releaseCage")}
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value=""
                      onValueChange={handleAssignKennel}
                      disabled={
                        isPending || availableKennelsForSession.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectCage")} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableKennelsForSession.map((k) => (
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
                  const next = getNextStatus(selectedSession.status);
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

      {/* ── Confirm Complete Dialog ─────────────────────────────── */}
      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirmCompleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t("confirmCompleteDesc")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCompleteOpen(false)}>
              {t("cancelled") || "Cancel"}
            </Button>
            <Button onClick={handleConfirmComplete} disabled={isPending}>
              {t("moveTo.COMPLETED")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Scheduled Appointments ─────────────────────────────── */}
      {scheduled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            {t("scheduledAppointments")} ({scheduled.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((appt) => (
              <Card key={appt.id} className="border-dashed">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{appt.pet.name}</span>
                    <div className="flex items-center gap-1">
                      {appt.pet.size && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {appt.pet.size}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {appt.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {appt.owner.firstName} {appt.owner.lastName}
                    {appt.owner.phone && ` · ${appt.owner.phone}`}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(appt.scheduledAt)}
                  </div>
                  {appt.groomingSession && (
                    <div className="flex flex-wrap gap-1">
                      {appt.groomingSession.services.map((svc) => (
                        <Badge key={svc} variant="outline" className="text-[10px] px-1.5 py-0">
                          {svc}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {appt.groomingSession?.groomer && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("groomer")}: {appt.groomingSession.groomer.firstName} {appt.groomingSession.groomer.lastName}
                    </p>
                  )}
                  {appt.groomingSession?.kennel && (
                    <p className="text-[10px] text-muted-foreground">
                      {t("cage")}: {appt.groomingSession.kennel.name} ({appt.groomingSession.kennel.size})
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── New Appointment Dialog ────────────────────────────── */}
      <Dialog open={newApptOpen} onOpenChange={setNewApptOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("newAppointment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Owner */}
            <div className="space-y-1.5">
              <Label>{t("owner")} *</Label>
              <Select
                value={newOwnerId}
                onValueChange={(v) => {
                  setNewOwnerId(v ?? "");
                  setNewPetId("");
                  setNewServices([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectOwner")}>
                    {newOwner ? `${newOwner.firstName} ${newOwner.lastName}` : t("selectOwner")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {formData.owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.firstName} {o.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pet */}
            <div className="space-y-1.5">
              <Label>{t("selectPet")} *</Label>
              <Select
                value={newPetId}
                onValueChange={(v) => {
                  setNewPetId(v ?? "");
                  setNewServices([]);
                }}
                disabled={!newOwnerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectPet")}>
                    {newPet ? `${newPet.name}${newPet.size ? ` (${newPet.size})` : ""}` : t("selectPet")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {newOwner?.pets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.size ? `(${p.size})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tc("date")} *</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("time")} *</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>

            {/* Groomer */}
            <div className="space-y-1.5">
              <Label>{t("groomer")}</Label>
              <Select value={newGroomerId} onValueChange={(v) => setNewGroomerId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectGroomer")}>
                    {newGroomerId
                      ? (() => { const g = formData.groomers.find((g) => g.id === newGroomerId); return g ? `${g.firstName} ${g.lastName}` : t("selectGroomer"); })()
                      : t("selectGroomer")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {formData.groomers.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.firstName} {g.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Services */}
            {newPetId && (
              <div className="space-y-1.5">
                <Label>{t("services")} *</Label>
                <div className="flex flex-wrap gap-2">
                  {availableNewServices.map((svc) => (
                    <Badge
                      key={svc.id}
                      variant={newServices.includes(svc.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleNewService(svc.name)}
                    >
                      {svc.name}
                    </Badge>
                  ))}
                </div>
                {availableNewServices.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("noServicesForSize")}</p>
                )}
              </div>
            )}

            {/* Special Instructions */}
            <div className="space-y-1.5">
              <Label>{t("specialInstructions")}</Label>
              <Textarea
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewApptOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={isPending || !newOwnerId || !newPetId || newServices.length === 0}
            >
              {isPending ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cage Occupancy ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("cageOccupancy")}</h2>
        {Object.keys(kennelsBySize).length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noCages")}</p>
        )}
        {Object.entries(kennelsBySize).map(([size, kennels]) => (
          <div key={size} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {size}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {kennels.map((kennel) => {
                const groomingOccupant =
                  kennel.groomingSessions.length > 0
                    ? kennel.groomingSessions[0]
                    : null;
                const clinicOccupant =
                  "appointments" in kennel && (kennel as any).appointments?.length > 0
                    ? (kennel as any).appointments[0]
                    : null;
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
                              : clinicOccupant.pet.name}
                          </p>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5">
                            {groomingOccupant ? (
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 gap-0.5">
                                <Scissors className="h-2.5 w-2.5" />
                                {t("title")}
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
