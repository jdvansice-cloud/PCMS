import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Dog,
  Plus,
  ShoppingCart,
  Users,
  PawPrint,
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getDashboardStats(organizationId: string) {
  const [ownerCount, petCount] = await Promise.all([
    prisma.owner.count({ where: { organizationId } }),
    prisma.pet.count({ where: { organizationId, isActive: true } }),
  ]);
  return { ownerCount, petCount };
}

export default async function DashboardPage() {
  const { organizationId } = await getCurrentUser();
  const { ownerCount, petCount } = await getDashboardStats(organizationId);

  const now = new Date();
  const greeting = getGreeting(now);
  const dateStr = now.toLocaleDateString("es-PA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats = [
    {
      label: "Clientes",
      value: String(ownerCount),
      subtitle: "Total registrados",
      icon: Users,
      color: "bg-[oklch(0.92_0.04_175)]",
      iconColor: "text-[oklch(0.50_0.12_175)]",
    },
    {
      label: "Mascotas",
      value: String(petCount),
      subtitle: "Pacientes activos",
      icon: Dog,
      color: "bg-[oklch(0.92_0.06_55)]",
      iconColor: "text-[oklch(0.60_0.14_55)]",
    },
    {
      label: "Citas Hoy",
      value: "0",
      subtitle: "Programadas",
      icon: Calendar,
      color: "bg-[oklch(0.92_0.06_300)]",
      iconColor: "text-[oklch(0.55_0.15_300)]",
    },
    {
      label: "Ventas Hoy",
      value: "$0.00",
      subtitle: "Ingresos del día",
      icon: ShoppingCart,
      color: "bg-[oklch(0.92_0.06_230)]",
      iconColor: "text-[oklch(0.55_0.15_230)]",
    },
  ];

  const quickActions = [
    { label: "Nuevo Cliente", href: "/dashboard/owners/new", icon: Users },
    { label: "Nueva Cita", href: "/dashboard/appointments", icon: Calendar },
    { label: "Nueva Venta", href: "/dashboard/pos", icon: ShoppingCart },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground capitalize">{dateStr}</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm border-0 shadow-black/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 ${stat.color}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className="h-10 rounded-lg gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's appointments */}
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Citas de Hoy</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No hay citas programadas para hoy
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Las citas aparecerán aquí cuando sean creadas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <PawPrint className="h-4 w-4 text-secondary" />
              <h3 className="font-semibold">Actividad Reciente</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <PawPrint className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Sin actividad reciente
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Registra tu primer cliente o mascota para comenzar
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}
