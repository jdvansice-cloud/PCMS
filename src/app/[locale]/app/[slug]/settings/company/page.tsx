"use client";

import { useState, useEffect, useRef } from "react";
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
import { getCompanyInfo, updateCompanyInfo, uploadLogo, removeLogo } from "../actions";
import { Camera, Trash2, Loader2, Copy, Check } from "lucide-react";

export default function CompanySettingsPage() {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
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
        setLogoUrl(info.logo ?? null);
      }
    });
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError("");
    setLogoLoading(true);

    const formData = new FormData();
    formData.append("logo", file);

    const result = await uploadLogo(formData);

    if ("error" in result && result.error) {
      setLogoError(result.error);
    } else if ("logoUrl" in result && result.logoUrl) {
      setLogoUrl(result.logoUrl);
    }

    setLogoLoading(false);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveLogo() {
    setLogoLoading(true);
    await removeLogo();
    setLogoUrl(null);
    setLogoLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCompanyInfo(data);
      const prefix = data.locale === "es" ? "" : `/${data.locale}`;
      window.location.href = `${prefix}/app/${organization.slug}/settings`;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("company")} backHref={`/app/${organization.slug}/settings`} />

      {/* Logo Upload Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Label className="text-sm font-medium">{t("companyLogo")}</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            {t("companyLogoDesc")}
          </p>
          <div className="flex items-center gap-4">
            {/* Logo preview */}
            <div
              className="relative h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt={data.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground/50" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                >
                  {logoUrl ? t("changeLogo") : t("uploadLogo")}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={logoLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("logoRequirements")}
              </p>
              {logoError && (
                <p className="text-xs text-destructive">{logoError}</p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Login URL Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Label className="text-sm font-medium">{t("loginUrl")}</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            {t("loginUrlDesc")}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono select-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/login/${organization.slug}`
                : `/login/${organization.slug}`}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/login/${organization.slug}`;
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Info Card */}
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
