"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getMyAppointments } from "../actions";
import { CalendarDays } from "lucide-react";

type Appointment = Awaited<ReturnType<typeof getMyAppointments>>[number];

export default function PortalAppointmentsPage() {
  const t = useTranslations("portal.appointments");
  const { organization } = usePortalTenant();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyAppointments(filter).then((a) => { setAppointments(a); setLoading(false); });
  }, [filter]);

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    COMPLETED: "default",
    SCHEDULED: "secondary",
    CONFIRMED: "secondary",
    IN_PROGRESS: "outline",
    CANCELLED: "destructive",
    NO_SHOW: "destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "upcoming" | "past")}>
        <TabsList>
          <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("past")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="animate-pulse h-40 bg-muted rounded-lg" />
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("noAppointments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {appointments.map((apt) => (
            <Link
              key={apt.id}
              href={`/portal/${organization.slug}/appointments/${apt.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {apt.serviceName ?? apt.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apt.petName} &middot;{" "}
                      {new Date(apt.scheduledAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {apt.vetName && (
                      <p className="text-xs text-muted-foreground">{apt.vetName}</p>
                    )}
                  </div>
                  <Badge variant={statusColors[apt.status] ?? "outline"} className="text-xs">
                    {apt.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
