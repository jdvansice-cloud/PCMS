"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { getCompanyInfo, updateCompanyInfo } from "../actions";

export default function CompanySettingsPage() {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    name: "", ruc: "", dv: "", phone: "", email: "", address: "", website: "", locale: "es" as string, timezone: "America/Panama" as string,
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
          locale: info.locale ?? "es",
          timezone: info.timezone ?? "America/Panama",
        });
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCompanyInfo(data);
      // Redirect with the selected locale so the UI language switches immediately
      const prefix = data.locale === "es" ? "" : `/${data.locale}`;
      window.location.href = `${prefix}/app/${organization.slug}/settings`;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("company")} backHref={`/app/${organization.slug}/settings`} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tf("clinicName")} *</Label>
                <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("ruc")}</Label>
                  <Input value={data.ruc} onChange={(e) => setData({ ...data, ruc: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("dv")}</Label>
                  <Input value={data.dv} onChange={(e) => setData({ ...data, dv: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{tc("phone")}</Label>
                <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("email")}</Label>
                <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{tf("website")}</Label>
                <Input value={data.website} onChange={(e) => setData({ ...data, website: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{tf("defaultLanguage")}</Label>
                <Select value={data.locale ?? "es"} onValueChange={(val) => setData({ ...data, locale: val ?? "es" })}>
                  <SelectTrigger>
                    <SelectValue placeholder={tf("selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tf("defaultLanguageDesc")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>{tf("timezone")}</Label>
                <Select value={data.timezone ?? "America/Panama"} onValueChange={(val) => setData({ ...data, timezone: val ?? "America/Panama" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Panama">Panama (UTC-5)</SelectItem>
                    <SelectItem value="America/Bogota">Colombia (UTC-5)</SelectItem>
                    <SelectItem value="America/Costa_Rica">Costa Rica (UTC-6)</SelectItem>
                    <SelectItem value="America/Guatemala">Guatemala (UTC-6)</SelectItem>
                    <SelectItem value="America/El_Salvador">El Salvador (UTC-6)</SelectItem>
                    <SelectItem value="America/Tegucigalpa">Honduras (UTC-6)</SelectItem>
                    <SelectItem value="America/Managua">Nicaragua (UTC-6)</SelectItem>
                    <SelectItem value="America/Mexico_City">Mexico City (UTC-6)</SelectItem>
                    <SelectItem value="America/Lima">Peru (UTC-5)</SelectItem>
                    <SelectItem value="America/Guayaquil">Ecuador (UTC-5)</SelectItem>
                    <SelectItem value="America/Caracas">Venezuela (UTC-4)</SelectItem>
                    <SelectItem value="America/Santiago">Chile (UTC-3/-4)</SelectItem>
                    <SelectItem value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">Brazil (UTC-3)</SelectItem>
                    <SelectItem value="America/Santo_Domingo">Dominican Republic (UTC-4)</SelectItem>
                    <SelectItem value="America/New_York">US Eastern (UTC-5/-4)</SelectItem>
                    <SelectItem value="America/Chicago">US Central (UTC-6/-5)</SelectItem>
                    <SelectItem value="America/Los_Angeles">US Pacific (UTC-8/-7)</SelectItem>
                    <SelectItem value="Europe/Madrid">Spain (UTC+1/+2)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tf("timezoneDesc")}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("address")}</Label>
              <Textarea value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={`/app/${organization.slug}/settings`}>
                <Button type="button" variant="outline">{tc("cancel")}</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? tf("saving") : tc("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
