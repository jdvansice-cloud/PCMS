"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Scissors } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
import {
  getGroomingConfig,
  getGroomingKennels,
  updateGroomingConfig,
  upsertGroomingKennels,
} from "../actions";

type GroomingConfig = Awaited<ReturnType<typeof getGroomingConfig>>;
type KennelData = Awaited<ReturnType<typeof getGroomingKennels>>;

interface Props {
  initialConfig: GroomingConfig;
  initialKennels: KennelData;
}

export function GroomingSettingsClient({ initialConfig, initialKennels }: Props) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tg = useTranslations("groomingSettings");
  const tc = useTranslations("common");

  const [config, setConfig] = useState({
    isOnlineBookingEnabled: initialConfig.isOnlineBookingEnabled,
    maxAdvanceDays: initialConfig.maxAdvanceDays,
    pickupCutoffTime: initialConfig.pickupCutoffTime,
    receivingCutoffTime: initialConfig.receivingCutoffTime,
    freeBathEnabled: initialConfig.freeBathEnabled,
    freeBathThreshold: initialConfig.freeBathThreshold,
  });

  const [kennels, setKennels] = useState({
    SMALL: initialKennels.SMALL,
    MEDIUM: initialKennels.MEDIUM,
    LARGE: initialKennels.LARGE,
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [savingKennels, setSavingKennels] = useState(false);

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      await updateGroomingConfig(config);
      router.refresh();
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSaveKennels() {
    setSavingKennels(true);
    try {
      await upsertGroomingKennels(kennels);
      router.refresh();
    } finally {
      setSavingKennels(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={tg("title")}>
        <Link href={`/app/${organization.slug}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToSettings")}
          </Button>
        </Link>
      </PageHeader>

      {/* Online Booking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            {tg("onlineBooking")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="booking-enabled">{tg("enableOnlineBooking")}</Label>
            <Switch
              id="booking-enabled"
              checked={config.isOnlineBookingEnabled}
              onCheckedChange={(checked: boolean) =>
                setConfig((c) => ({ ...c, isOnlineBookingEnabled: checked }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="max-advance">{tg("maxAdvanceDays")}</Label>
              <Input
                id="max-advance"
                type="number"
                min={1}
                max={30}
                value={config.maxAdvanceDays}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, maxAdvanceDays: parseInt(e.target.value) || 7 }))
                }
              />
              <p className="text-xs text-muted-foreground">{tg("maxAdvanceDaysHelp")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cutoff Times */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tg("cutoffTimes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pickup-cutoff">{tg("pickupCutoff")}</Label>
              <Input
                id="pickup-cutoff"
                type="time"
                value={config.pickupCutoffTime}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, pickupCutoffTime: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">{tg("pickupCutoffHelp")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receiving-cutoff">{tg("receivingCutoff")}</Label>
              <Input
                id="receiving-cutoff"
                type="time"
                value={config.receivingCutoffTime}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, receivingCutoffTime: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">{tg("receivingCutoffHelp")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Bath Promotion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tg("freeBathPromo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="free-bath">{tg("enableFreeBath")}</Label>
              <p className="text-xs text-muted-foreground">{tg("freeBathHelp")}</p>
            </div>
            <Switch
              id="free-bath"
              checked={config.freeBathEnabled}
              onCheckedChange={(checked: boolean) =>
                setConfig((c) => ({ ...c, freeBathEnabled: checked }))
              }
            />
          </div>

          {config.freeBathEnabled && (
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="bath-threshold">{tg("freeBathThreshold")}</Label>
              <Input
                id="bath-threshold"
                type="number"
                min={2}
                max={50}
                value={config.freeBathThreshold}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, freeBathThreshold: parseInt(e.target.value) || 5 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {tg("freeBathThresholdHelp", { count: config.freeBathThreshold })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveConfig} disabled={savingConfig}>
          {savingConfig ? tc("saving") : tc("save")}
        </Button>
      </div>

      {/* Cage Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tg("cageManagement")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tg("cageManagementHelp")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="small-cages">{tg("smallCages")}</Label>
              <Input
                id="small-cages"
                type="number"
                min={0}
                max={50}
                value={kennels.SMALL}
                onChange={(e) =>
                  setKennels((k) => ({ ...k, SMALL: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground">{tg("smallCagesHelp")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="medium-cages">{tg("mediumCages")}</Label>
              <Input
                id="medium-cages"
                type="number"
                min={0}
                max={50}
                value={kennels.MEDIUM}
                onChange={(e) =>
                  setKennels((k) => ({ ...k, MEDIUM: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground">{tg("mediumCagesHelp")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="large-cages">{tg("largeCages")}</Label>
              <Input
                id="large-cages"
                type="number"
                min={0}
                max={50}
                value={kennels.LARGE}
                onChange={(e) =>
                  setKennels((k) => ({ ...k, LARGE: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground">{tg("largeCagesHelp")}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveKennels} disabled={savingKennels}>
              {savingKennels ? tc("saving") : tg("saveCages")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
