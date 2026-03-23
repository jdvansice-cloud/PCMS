"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/lib/use-format-date";
import { useTenant } from "@/lib/tenant-context";
import {
  getDailyPickups,
  confirmPickup,
  updatePickupStatus,
  optimizeRouteAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Pickup = Awaited<ReturnType<typeof getDailyPickups>>[number];

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  EN_ROUTE_PICKUP: "bg-indigo-100 text-indigo-800",
  PICKED_UP: "bg-purple-100 text-purple-800",
  EN_ROUTE_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function PickupRouteClient({
  initialPickups,
  initialDate,
}: {
  initialPickups: Pickup[];
  initialDate: string;
}) {
  const t = useTranslations("grooming");
  const { organization } = useTenant();
  const { formatTime } = useFormatDate();
  const [pickups, setPickups] = useState<Pickup[]>(initialPickups);
  const [date, setDate] = useState(initialDate);
  const [isPending, startTransition] = useTransition();

  // Confirm dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmPickupId, setConfirmPickupId] = useState<string | null>(null);
  const [confirmTime, setConfirmTime] = useState("09:00");

  function refreshPickups(newDate?: string) {
    const d = newDate ?? date;
    startTransition(async () => {
      const data = await getDailyPickups(d);
      setPickups(data);
    });
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    refreshPickups(newDate);
  }

  function handleOptimizeRoute() {
    startTransition(async () => {
      await optimizeRouteAction(date);
      const data = await getDailyPickups(date);
      setPickups(data);
    });
  }

  function openConfirmDialog(pickupId: string) {
    setConfirmPickupId(pickupId);
    setConfirmTime("09:00");
    setConfirmDialogOpen(true);
  }

  function handleConfirm() {
    if (!confirmPickupId) return;
    startTransition(async () => {
      await confirmPickup(confirmPickupId, confirmTime);
      setConfirmDialogOpen(false);
      setConfirmPickupId(null);
      const data = await getDailyPickups(date);
      setPickups(data);
    });
  }

  function handleStatusUpdate(pickupId: string, status: string) {
    startTransition(async () => {
      await updatePickupStatus(pickupId, status);
      const data = await getDailyPickups(date);
      setPickups(data);
    });
  }

  function renderActions(pickup: Pickup) {
    switch (pickup.status) {
      case "REQUESTED":
        return (
          <Button
            size="sm"
            onClick={() => openConfirmDialog(pickup.id)}
            disabled={isPending}
          >
            {t("confirm")}
          </Button>
        );
      case "CONFIRMED":
        return (
          <Button
            size="sm"
            onClick={() => handleStatusUpdate(pickup.id, "EN_ROUTE_PICKUP")}
            disabled={isPending}
          >
            {t("enRoute")}
          </Button>
        );
      case "EN_ROUTE_PICKUP":
        return (
          <Button
            size="sm"
            onClick={() => handleStatusUpdate(pickup.id, "PICKED_UP")}
            disabled={isPending}
          >
            {t("pickedUp")}
          </Button>
        );
      case "PICKED_UP":
        return (
          <Button
            size="sm"
            onClick={() => handleStatusUpdate(pickup.id, "EN_ROUTE_DELIVERY")}
            disabled={isPending}
          >
            {t("enRouteDelivery")}
          </Button>
        );
      case "EN_ROUTE_DELIVERY":
        return (
          <Button
            size="sm"
            onClick={() => handleStatusUpdate(pickup.id, "DELIVERED")}
            disabled={isPending}
          >
            {t("delivered")}
          </Button>
        );
      case "DELIVERED":
        return (
          <span className="text-green-600 text-lg font-bold" aria-label={t("delivered")}>
            &#10003;
          </span>
        );
      case "CANCELLED":
        return (
          <span className="text-muted-foreground line-through text-sm">
            {t("statusLabels.CANCELLED")}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pickupRoute")}
        </h1>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-auto"
          />
          <Button
            variant="outline"
            onClick={handleOptimizeRoute}
            disabled={isPending || pickups.length === 0}
          >
            {t("optimizeRoute")}
          </Button>
        </div>
      </div>

      {/* Pickup list */}
      {pickups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("noPickups")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pickups.map((pickup) => (
            <Card
              key={pickup.id}
              className={pickup.status === "CANCELLED" ? "opacity-60" : ""}
            >
              <CardContent className="flex items-center gap-4 py-4">
                {/* Route order badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {pickup.routeOrder ?? "-"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold ${pickup.status === "CANCELLED" ? "line-through" : ""}`}
                    >
                      {pickup.ownerName}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span
                      className={pickup.status === "CANCELLED" ? "line-through" : ""}
                    >
                      {pickup.petName}
                    </span>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[pickup.status] ?? ""}
                    >
                      {t(`statusLabels.${pickup.status}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {pickup.address}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {pickup.pickupTime && (
                      <span>
                        {t("pickupTimeLabel")}: {pickup.pickupTime}
                      </span>
                    )}
                    {pickup.deliveredAt && (
                      <span>
                        {t("deliveredAtLabel")}:{" "}
                        {formatTime(pickup.deliveredAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0">{renderActions(pickup)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm pickup dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmPickupTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pickup-time">{t("pickupTimeLabel")}</Label>
              <Input
                id="pickup-time"
                type="time"
                value={confirmTime}
                onChange={(e) => setConfirmTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
