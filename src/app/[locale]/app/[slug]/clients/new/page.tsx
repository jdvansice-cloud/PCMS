"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "next-intl";
import { createOwner } from "../actions";

export default function NewClientPage() {
  const { organization } = useTenant();
  const base = `/app/${organization.slug}/clients`;
  const t = useTranslations("clients");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      <PageHeader title={t("newClient")} backHref={base} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form action={createOwner} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("firstName")} *</Label>
                <Input name="firstName" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("lastName")} *</Label>
                <Input name="lastName" required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("cedula")}</Label>
                <Input name="cedula" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("ruc")}</Label>
                <Input name="ruc" />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("email")}</Label>
                <Input name="email" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("phone")}</Label>
                <Input name="phone" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("whatsapp")}</Label>
                <Input name="whatsapp" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("address")}</Label>
              <Textarea name="address" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{tc("notes")}</Label>
              <Textarea name="notes" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href={base}>
                <Button type="button" variant="outline">{tc("cancel")}</Button>
              </Link>
              <Button type="submit">{tc("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
