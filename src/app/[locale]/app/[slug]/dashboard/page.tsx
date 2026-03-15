import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Dog, Plus, ShoppingCart, Users, PawPrint } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getDashboardStats(organizationId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [ownerCount, petCount, appointmentsToday, salesToday] = await Promise.all([
    prisma.owner.count({ where: { organizationId } }),
    prisma.pet.count({ where: { organizationId, isActive: true } }),
    prisma.appointment.count({
      where: { organizationId, scheduledAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.sale.aggregate({
      where: { organizationId, createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
    }),
  ]);

  return {
    ownerCount,
    petCount,
    appointmentsToday,
    salesTodayTotal: Number(salesToday._sum.total ?? 0),
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organizationId } = await getCurrentUser();
  const stats = await getDashboardStats(organizationId);
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("dashboard.stats");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("greeting.morning") : hour < 18 ? t("greeting.afternoon") : t("greeting.evening");
  const dateStr = now.toLocaleDateString("es-PA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const base = `/app/${slug}`;

  const statCards = [
    { label: ts("clients"), value: String(stats.ownerCount), subtitle: ts("totalRegistered"), icon: Users, color: "bg-[oklch(0.92_0.04_175)]", iconColor: "text-[oklch(0.50_0.12_175)]" },
    { label: ts("pets"), value: String(stats.petCount), subtitle: ts("activePatients"), icon: Dog, color: "bg-[oklch(0.92_0.06_55)]", iconColor: "text-[oklch(0.60_0.14_55)]" },
    { label: ts("appointmentsToday"), value: String(stats.appointmentsToday), subtitle: ts("scheduled"), icon: Calendar, color: "bg-[oklch(0.92_0.06_300)]", iconColor: "text-[oklch(0.55_0.15_300)]" },
    { label: ts("salesToday"), value: `$${stats.salesTodayTotal.toFixed(2)}`, subtitle: ts("dailyRevenue"), icon: ShoppingCart, color: "bg-[oklch(0.92_0.06_230)]", iconColor: "text-[oklch(0.55_0.15_230)]" },
  ];

  const quickActions = [
    { label: t("newClient"), href: `${base}/clients/new`, icon: Users },
    { label: t("newAppointment"), href: `${base}/appointments/new`, icon: Calendar },
    { label: t("newSale"), href: `${base}/pos`, icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pt-14 lg:pt-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground capitalize text-sm sm:text-base">{dateStr}</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-sm border-0 shadow-black/5">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{stat.subtitle}</p>
                </div>
                <div className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 ${stat.color} shrink-0`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("quickActions")}
        </h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button variant="outline" className="h-9 sm:h-10 rounded-lg gap-2 border-dashed text-xs sm:text-sm">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">{t("todaysAppointments")}</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
              <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t("noAppointments")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <PawPrint className="h-4 w-4 text-secondary" />
              <h3 className="font-semibold text-sm sm:text-base">{t("recentActivity")}</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
              <div className="rounded-full bg-muted p-3 sm:p-4 mb-3 sm:mb-4">
                <PawPrint className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t("noActivity")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
