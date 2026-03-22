"use client";

import { useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  getGroomingBoard,
  getGroomers,
  assignKennel,
  releaseKennel,
  assignGroomer,
  updateGroomingStatus,
  getKennelOccupancy,
} from "./actions";
import { PageHeader } from "@/components/page-header";
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

// ---------------------------------------------------------------------------
// Types inferred from server actions
// ---------------------------------------------------------------------------
type BoardData = Awaited<ReturnType<typeof getGroomingBoard>>;
type GroomerList = Awaited<ReturnType<typeof getGroomers>>;
type Session = BoardData["sessions"][number];
type KennelOccupancy = Awaited<ReturnType<typeof getKennelOccupancy>>;

type Props = {
  initialData: BoardData;
  initialGroomers: GroomerList;
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
export function GroomingBoardClient({
  initialData,
  initialGroomers,
  initialDate,
}: Props) {
  const t = useTranslations("grooming");
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState<BoardData>(initialData);
  const [groomers] = useState<GroomerList>(initialGroomers);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kennelOccupancy, setKennelOccupancy] =
    useState<KennelOccupancy | null>(null);

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
  if (kennelOccupancy === null) {
    startTransition(async () => {
      const occ = await getKennelOccupancy(date);
      setKennelOccupancy(occ);
    });
  }

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
    startTransition(async () => {
      await updateGroomingStatus(selectedSession.id, newStatus);
      refreshBoard();
      setDialogOpen(false);
      setSelectedSession(null);
    });
  };

  const openDetail = (session: Session) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  // -- Available kennels for the selected session's petSize -----------------
  const availableKennelsForSession = selectedSession?.petSize
    ? data.availableKennels[selectedSession.petSize] ?? []
    : [];

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
        <Input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-44"
        />
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
                      {session.appointment?.groomingPickup && (
                        <span title={t("pickup")} className="text-base">
                          {"\uD83D\uDE90"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.pet.owner.firstName}{" "}
                      {session.pet.owner.lastName}
                    </p>
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
                      <SelectValue placeholder={t("selectGroomer")} />
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
                const occupant =
                  kennel.groomingSessions.length > 0
                    ? kennel.groomingSessions[0]
                    : null;
                return (
                  <Card
                    key={kennel.id}
                    className={
                      occupant
                        ? "border-blue-300 bg-blue-50"
                        : "border-green-300 bg-green-50"
                    }
                  >
                    <CardContent className="p-2 text-center">
                      <p className="text-xs font-semibold">{kennel.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {occupant ? occupant.pet.name : t("empty")}
                      </p>
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
