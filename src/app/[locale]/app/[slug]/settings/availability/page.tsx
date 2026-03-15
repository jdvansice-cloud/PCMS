"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { getBusinessHours, updateBusinessHours } from "../actions";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type DayHours = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };

export default function AvailabilityPage() {
  const { organization } = useTenant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      openTime: "08:00",
      closeTime: "18:00",
      isClosed: i === 0,
    }))
  );

  useEffect(() => {
    getBusinessHours().then((bh) => {
      if (bh.length > 0) {
        setHours((prev) =>
          prev.map((d) => {
            const found = bh.find((h: DayHours) => h.dayOfWeek === d.dayOfWeek);
            return found ? { ...d, openTime: found.openTime, closeTime: found.closeTime, isClosed: found.isClosed } : d;
          })
        );
      }
    });
  }, []);

  function updateDay(idx: number, field: keyof DayHours, value: string | boolean) {
    setHours((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateBusinessHours(hours);
      router.push(`/app/${organization.slug}/settings`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Horario de Atención">
        <Link href={`/app/${organization.slug}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            {hours.map((day, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b last:border-0">
                <div className="flex items-center gap-2 sm:w-32">
                  <Switch
                    checked={!day.isClosed}
                    onCheckedChange={(v) => updateDay(idx, "isClosed", !v)}
                  />
                  <span className={`text-sm font-medium ${day.isClosed ? "text-muted-foreground" : ""}`}>
                    {DAYS[idx]}
                  </span>
                </div>
                {!day.isClosed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={day.openTime}
                      onChange={(e) => updateDay(idx, "openTime", e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground text-sm">a</span>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => updateDay(idx, "closeTime", e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
                {day.isClosed && (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
              <Link href={`/app/${organization.slug}/settings`}>
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
