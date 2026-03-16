"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { createService } from "../actions";

export default function NewServicePage() {
  const { organization } = useTenant();
  const base = `/app/${organization.slug}/services`;
  const tc = useTranslations("common");
  const ts = useTranslations("services");
  const ta = useTranslations("appointments");
  const tf = useTranslations("form");

  return (
    <div className="space-y-6">
      <PageHeader title={ts("newService")}>
        <Link href={base}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form action={createService} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tc("name")} *</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label>{ta("type")} *</Label>
                <Select name="type" defaultValue="CONSULTATION">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTATION">{ts("typeLabels.CONSULTATION")}</SelectItem>
                    <SelectItem value="VACCINATION">{ts("typeLabels.VACCINATION")}</SelectItem>
                    <SelectItem value="SURGERY">{ts("typeLabels.SURGERY")}</SelectItem>
                    <SelectItem value="GROOMING">{ts("typeLabels.GROOMING")}</SelectItem>
                    <SelectItem value="FOLLOW_UP">{ts("typeLabels.FOLLOW_UP")}</SelectItem>
                    <SelectItem value="EMERGENCY">{ts("typeLabels.EMERGENCY")}</SelectItem>
                    <SelectItem value="OTHER">{ts("typeLabels.OTHER")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{tf("priceBs")} *</Label>
                <Input name="price" type="number" step="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label>{ts("duration")} (min) *</Label>
                <Input name="durationMin" type="number" defaultValue="30" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("description")}</Label>
              <Textarea name="description" rows={2} />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isTaxExempt" className="rounded" />
                {tf("taxExempt")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isBookable" defaultChecked className="rounded" />
                {tf("bookableOnline")}
              </label>
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
