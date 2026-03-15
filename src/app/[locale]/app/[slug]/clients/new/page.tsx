"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { createOwner } from "../actions";

export default function NewClientPage() {
  const { organization } = useTenant();
  const base = `/app/${organization.slug}/clients`;

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Cliente">
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form action={createOwner} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input name="firstName" required />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido *</Label>
                <Input name="lastName" required />
              </div>
              <div className="space-y-1.5">
                <Label>Cédula</Label>
                <Input name="cedula" />
              </div>
              <div className="space-y-1.5">
                <Label>RUC</Label>
                <Input name="ruc" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input name="phone" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input name="whatsapp" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Textarea name="address" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
