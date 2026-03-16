"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
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
    name: "", ruc: "", dv: "", phone: "", email: "", address: "", website: "", locale: "es" as string,
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
      <PageHeader title={t("company")}>
        <Link href={`/app/${organization.slug}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5">
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
