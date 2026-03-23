"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/lib/use-format-date";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import { formatCurrency } from "@/lib/utils";
import { getLoyaltyConfig, getTopLoyaltyHolders, updateLoyaltyConfig } from "../actions";

type LoyaltyConfig = Awaited<ReturnType<typeof getLoyaltyConfig>>;
type TopHolder = Awaited<ReturnType<typeof getTopLoyaltyHolders>>[number];

interface LoyaltyClientProps {
  initialConfig: LoyaltyConfig;
  initialTopHolders: TopHolder[];
}

export function LoyaltyClient({ initialConfig, initialTopHolders }: LoyaltyClientProps) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { formatDate: fmtDate } = useFormatDate();

  const [config, setConfig] = useState<LoyaltyConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [topHolders] = useState<TopHolder[]>(initialTopHolders);

  async function handleSave() {
    setSaving(true);
    try {
      await updateLoyaltyConfig({
        isEnabled: config.isEnabled,
        dollarRate: config.dollarRate,
        expirationDays: config.expirationDays,
        minRedemption: config.minRedemption,
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const earnedPreview = config.dollarRate * 100;

  return (
    <div className="space-y-6">
      <PageHeader title={t("loyaltyTitle")} backHref={`/app/${organization.slug}/settings`} />

      {/* Configuration Card */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Program active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="loyalty-enabled">{t("loyaltyEnabled")}</Label>
            <Switch
              id="loyalty-enabled"
              checked={config.isEnabled}
              onCheckedChange={(checked: boolean) =>
                setConfig((prev) => ({ ...prev, isEnabled: checked }))
              }
            />
          </div>

          {/* Earn rate */}
          <div className="space-y-1.5">
            <Label htmlFor="dollar-rate">{t("loyaltyEarnRate")}</Label>
            <p className="text-xs text-muted-foreground">{t("loyaltyEarnRateDesc")}</p>
            <Input
              id="dollar-rate"
              type="number"
              step="0.01"
              min="0"
              value={config.dollarRate}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  dollarRate: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>

          {/* Expiration days */}
          <div className="space-y-1.5">
            <Label htmlFor="expiration-days">{t("loyaltyExpiration")}</Label>
            <p className="text-xs text-muted-foreground">{t("loyaltyExpirationDesc")}</p>
            <Input
              id="expiration-days"
              type="number"
              step="1"
              min="0"
              value={config.expirationDays}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  expirationDays: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

          {/* Minimum redemption */}
          <div className="space-y-1.5">
            <Label htmlFor="min-redemption">{t("loyaltyMinRedemption")}</Label>
            <p className="text-xs text-muted-foreground">{t("loyaltyMinRedemptionDesc")}</p>
            <Input
              id="min-redemption"
              type="number"
              step="0.01"
              min="0"
              value={config.minRedemption}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  minRedemption: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>

          {/* Preview */}
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            {config.expirationDays > 0
              ? t("loyaltyPreview", {
                  amount: formatCurrency(100),
                  earned: formatCurrency(earnedPreview),
                  days: config.expirationDays,
                })
              : t("loyaltyPreviewNoExpiry", {
                  amount: formatCurrency(100),
                  earned: formatCurrency(earnedPreview),
                })}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? tc("loading") : tc("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Balances Card */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold mb-4">{t("topHolders")}</h2>
          {topHolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Gift className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("noLoyaltyHolders")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{t("loyaltyHolderBalance")}</TableHead>
                  <TableHead>{tc("lastActivity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHolders.map((holder) => (
                  <TableRow key={holder.ownerId}>
                    <TableCell className="font-medium">
                      {holder.firstName} {holder.lastName}
                    </TableCell>
                    <TableCell>{formatCurrency(holder.balance)}</TableCell>
                    <TableCell>
                      {fmtDate(holder.lastActivity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
