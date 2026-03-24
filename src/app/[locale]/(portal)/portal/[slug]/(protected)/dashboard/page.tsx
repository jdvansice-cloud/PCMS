"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getPortalDashboard } from "../actions";
import { PawPrint, CalendarDays, Star, ChevronRight } from "lucide-react";

type DashboardData = Awaited<ReturnType<typeof getPortalDashboard>>;

export default function PortalDashboardPage() {
  const t = useTranslations("portal.dashboard");
  const ct = useTranslations("portal.nav");
  const { owner, organization } = usePortalTenant();
  const [data, setData] = useState<DashboardData | null>(null);

  const base = `/portal/${organization.slug}`;

  useEffect(() => {
    getPortalDashboard().then(setData);
  }, []);

  if (!data) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: owner.firstName })}
      </h1>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={PawPrint}
          label={ct("pets")}
          value={data.petCount.toString()}
          href={`${base}/pets`}
        />
        <StatCard
          icon={CalendarDays}
          label={t("upcoming")}
          value={data.upcomingAppointments.length.toString()}
          href={`${base}/appointments`}
        />
        <StatCard
          icon={Star}
          label={ct("loyalty")}
          value={data.loyaltyBalance.toString()}
          href={`${base}/loyalty`}
        />
      </div>

      {/* Upcoming appointments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">{t("upcomingAppointments")}</h2>
            <Link
              href={`${base}/appointments`}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              {t("viewAll")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {data.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingAppointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`${base}/appointments/${apt.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
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
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {apt.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: any;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
