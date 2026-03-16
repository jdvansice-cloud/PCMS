import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Dog,
  Plus,
  ShoppingCart,
  Users,
  PawPrint,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getDashboardData(organizationId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [ownerCount, petCount, appointmentsToday, salesToday, todayAppointments, recentActivity] =
    await Promise.all([
      prisma.owner.count({ where: { organizationId } }),
      prisma.pet.count({ where: { organizationId, isActive: true } }),
      prisma.appointment.count({
        where: { organizationId, scheduledAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.sale.aggregate({
        where: { organizationId, createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true },
      }),
      // Today's appointments with details
      prisma.appointment.findMany({
        where: { organizationId, scheduledAt: { gte: todayStart, lte: todayEnd } },
        include: {
          pet: { select: { name: true, species: true } },
          owner: { select: { firstName: true, lastName: true } },
          vet: { select: { firstName: true, lastName: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 6,
      }),
      // Recent audit log for activity feed
      prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  // Enrich audit logs with user names
  const userIds = [...new Set(recentActivity.filter((a) => a.userId).map((a) => a.userId!))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const enrichedActivity = recentActivity.map((log) => ({
    ...log,
    user: log.userId ? userMap[log.userId] || null : null,
  }));

  return {
    ownerCount,
    petCount,
    appointmentsToday,
    salesTodayTotal: Number(salesToday._sum.total ?? 0),
    todayAppointments: JSON.parse(JSON.stringify(todayAppointments)),
    recentActivity: JSON.parse(JSON.stringify(enrichedActivity)),
  };
}

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-[var(--status-scheduled)]/10 text-[var(--status-scheduled)]",
  CONFIRMED: "bg-[var(--status-confirmed)]/10 text-[var(--status-confirmed)]",
  IN_PROGRESS: "bg-[var(--status-in-progress)]/10 text-[var(--status-in-progress)]",
  COMPLETED: "bg-[var(--status-completed)]/10 text-[var(--status-completed)]",
  CANCELLED: "bg-[var(--status-cancelled)]/10 text-[var(--status-cancelled)]",
  NO_SHOW: "bg-[var(--status-no-show)]/10 text-[var(--status-no-show)]",
};

const actionLabels: Record<string, string> = {
  CREATE: "creó",
  UPDATE: "actualizó",
  DELETE: "eliminó",
  SOFT_DELETE: "desactivó",
};

const entityLabels: Record<string, string> = {
  OWNER: "cliente",
  PET: "mascota",
  APPOINTMENT: "cita",
  SALE: "venta",
  SERVICE: "servicio",
  PRODUCT: "producto",
  ORGANIZATION: "clínica",
  BUSINESS_HOURS: "horario",
  BRANDING: "marca",
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organizationId } = await getCurrentUser();
  const data = await getDashboardData(organizationId);
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("dashboard.stats");

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t("greeting.morning") : hour < 18 ? t("greeting.afternoon") : t("greeting.evening");
  const dateStr = now.toLocaleDateString("es-PA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const base = `/app/${slug}`;

  const statCards = [
    {
      label: ts("clients"),
      value: String(data.ownerCount),
      subtitle: ts("totalRegistered"),
      icon: Users,
      color: "bg-[oklch(0.94_0.08_175)]",
      iconColor: "text-[oklch(0.45_0.18_175)]",
      href: `${base}/clients`,
    },
    {
      label: ts("pets"),
      value: String(data.petCount),
      subtitle: ts("activePatients"),
      icon: Dog,
      color: "bg-[oklch(0.94_0.10_55)]",
      iconColor: "text-[oklch(0.55_0.20_55)]",
      href: `${base}/pets`,
    },
    {
      label: ts("appointmentsToday"),
      value: String(data.appointmentsToday),
      subtitle: ts("scheduled"),
      icon: Calendar,
      color: "bg-[oklch(0.94_0.10_300)]",
      iconColor: "text-[oklch(0.50_0.20_300)]",
      href: `${base}/appointments`,
    },
    {
      label: ts("salesToday"),
      value: `$${data.salesTodayTotal.toFixed(2)}`,
      subtitle: ts("dailyRevenue"),
      icon: ShoppingCart,
      color: "bg-[oklch(0.94_0.10_230)]",
      iconColor: "text-[oklch(0.50_0.20_230)]",
      href: `${base}/pos/sales`,
    },
  ];

  const quickActions = [
    { label: t("newClient"), href: `${base}/clients/new`, icon: Users },
    { label: t("newAppointment"), href: `${base}/appointments/new`, icon: Calendar },
    { label: t("newSale"), href: `${base}/pos`, icon: ShoppingCart },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground capitalize mt-1">{dateStr}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="cursor-pointer">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      {stat.label}
                    </p>
                    <p className="text-xl sm:text-3xl font-semibold tracking-tight">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 ${stat.color} shrink-0`}>
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("quickActions")}
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className="h-9 sm:h-10 rounded-lg gap-2 border-dashed text-sm"
              >
                <Plus className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Appointments + Recent Activity */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{t("todaysAppointments")}</h3>
              </div>
              {data.todayAppointments.length > 0 && (
                <Link
                  href={`${base}/appointments`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {t("viewAll")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {data.todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {data.todayAppointments.map((apt: any) => (
                  <Link
                    key={apt.id}
                    href={`${base}/appointments/${apt.id}`}
                    className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {apt.pet?.name} — {apt.owner?.firstName} {apt.owner?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.scheduledAt).toLocaleTimeString("es-PA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {apt.vet && ` · Dr. ${apt.vet.firstName}`}
                        {apt.type && ` · ${apt.type}`}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${statusColors[apt.status] || ""}`}
                    >
                      {apt.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
                <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("noAppointments")}</p>
                <Link href={`${base}/appointments/new`} className="mt-3">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {t("newAppointment")}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <PawPrint className="h-4 w-4 text-secondary" />
              <h3 className="font-semibold">{t("recentActivity")}</h3>
            </div>

            {data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg p-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold">
                        {log.user?.firstName?.charAt(0)}
                        {log.user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {log.user?.firstName} {log.user?.lastName}
                        </span>{" "}
                        {actionLabels[log.action] || log.action}{" "}
                        {entityLabels[log.entityType] || log.entityType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("es-PA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
                <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
                  <PawPrint className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("noActivity")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
