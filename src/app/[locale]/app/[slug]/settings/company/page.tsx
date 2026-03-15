"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { getCompanyInfo, updateCompanyInfo } from "../actions";

export default function CompanySettingsPage() {
  const { organization } = useTenant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    name: "", ruc: "", dv: "", phone: "", email: "", address: "", website: "",
  });

  useEffect(() => {
    getCompanyInfo().then((info) => {
      if (info) {
        setData({
          name: info.name ?? "",
          ruc: info.ruc ?? "",
          dv: info.dv ?? "",
          phone: info.phone ?? "",
          email: info.email ?? "",
          address: info.address ?? "",
          website: info.website ?? "",
        });
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCompanyInfo(data);
      router.push(`/app/${organization.slug}/settings`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Información de la Empresa">
        <Link href={`/app/${organization.slug}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre de la Clínica *</Label>
                <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>RUC</Label>
                  <Input value={data.ruc} onChange={(e) => setData({ ...data, ruc: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>DV</Label>
                  <Input value={data.dv} onChange={(e) => setData({ ...data, dv: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sitio Web</Label>
                <Input value={data.website} onChange={(e) => setData({ ...data, website: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Textarea value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
