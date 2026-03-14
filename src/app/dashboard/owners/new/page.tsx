"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createOwner } from "../actions";
import type { OwnerFormData } from "@/lib/validators/owner";

export default function NewOwnerPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data: OwnerFormData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      cedula: formData.get("cedula") as string,
      ruc: formData.get("ruc") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      whatsapp: formData.get("whatsapp") as string,
      address: formData.get("address") as string,
      notes: formData.get("notes") as string,
    };

    const result = await createOwner(data);

    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setSaving(false);
    }
    // On success, server action redirects to owner detail page
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/owners">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title="Nuevo Cliente"
          description="Registra un nuevo cliente en el sistema"
        />
      </div>

      <Card className="max-w-2xl shadow-sm border-0 shadow-black/5">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" name="firstName" required />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input id="lastName" name="lastName" required />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName[0]}</p>
                )}
              </div>
            </div>

            {/* ID fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cedula">Cédula</Label>
                <Input id="cedula" name="cedula" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruc">RUC</Label>
                <Input id="ruc" name="ruc" />
              </div>
            </div>

            {/* Contact fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" type="tel" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" name="address" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cliente"}
              </Button>
              <Link href="/dashboard/owners">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
