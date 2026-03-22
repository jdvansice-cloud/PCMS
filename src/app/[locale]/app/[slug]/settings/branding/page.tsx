"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTenant } from "@/lib/tenant-context";
import { getBranding, updateBranding } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Palette, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const FONT_OPTIONS = [
  "Inter",
  "Geist",
  "Plus Jakarta Sans",
  "DM Sans",
  "Nunito",
  "Poppins",
];

export default function BrandingPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const { organization } = useTenant();
  const router = useRouter();
  const slug = organization.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#14b8a6");
  const [secondaryColor, setSecondaryColor] = useState("#fb923c");
  const [accentColor, setAccentColor] = useState("");
  const [sidebarColor, setSidebarColor] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    getBranding().then((data) => {
      if (data) {
        setPrimaryColor(data.primaryColor);
        setSecondaryColor(data.secondaryColor);
        setAccentColor(data.accentColor || "");
        setSidebarColor(data.sidebarColor || "");
        setFontFamily(data.fontFamily);
        setDarkMode(data.darkMode);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateBranding({
        primaryColor,
        secondaryColor,
        accentColor: accentColor || undefined,
        sidebarColor: sidebarColor || undefined,
        fontFamily,
        darkMode,
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={t("branding")} description={t("brandingDesc")} backHref={`/app/${slug}/settings`} />

      {/* Color Pickers */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">{tf("colors")}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>{tf("primaryColor")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#14b8a6"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {tf("primaryColorDesc")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{tf("secondaryColor")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#fb923c"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {tf("secondaryColorDesc")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{tf("accentColor")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor || "#8b5cf6"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#8b5cf6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tf("sidebarColor")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={sidebarColor || "#1a5c52"}
                  onChange={(e) => setSidebarColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer"
                />
                <Input
                  value={sidebarColor}
                  onChange={(e) => setSidebarColor(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#1a5c52"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">{tf("preview")}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="h-10 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {tf("primary")}
              </div>
              <div
                className="h-10 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: secondaryColor }}
              >
                {tf("secondary")}
              </div>
              {accentColor && (
                <div
                  className="h-10 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  {tf("accent")}
                </div>
              )}
              {sidebarColor && (
                <div
                  className="h-10 w-24 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: sidebarColor }}
                >
                  {tf("sidebar")}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">{tf("typography")}</h2>
          <div className="space-y-2">
            <Label>{tf("mainFont")}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  onClick={() => setFontFamily(font)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    fontFamily === font
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-sm font-medium" style={{ fontFamily: font }}>
                    {font}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: font }}>
                    Aa Bb Cc 123
                  </p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dark Mode */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{tf("darkMode")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tf("darkModeDesc")}
              </p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? tf("saving") : tf("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
