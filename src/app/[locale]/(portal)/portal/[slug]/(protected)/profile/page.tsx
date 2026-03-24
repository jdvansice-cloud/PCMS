"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { updateMyProfile } from "../actions";
import { Loader2, Check } from "lucide-react";

export default function PortalProfilePage() {
  const t = useTranslations("portal.profile");
  const { owner } = usePortalTenant();

  const [firstName, setFirstName] = useState(owner.firstName);
  const [lastName, setLastName] = useState(owner.lastName);
  const [phone, setPhone] = useState(owner.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(owner.whatsapp ?? "");
  const [address, setAddress] = useState(owner.address ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    await updateMyProfile({
      firstName,
      lastName,
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
    });

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("firstName")}</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("lastName")}</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input value={owner.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">{t("emailReadOnly")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  type="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("address")}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : null}
                {saved ? t("saved") : t("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
