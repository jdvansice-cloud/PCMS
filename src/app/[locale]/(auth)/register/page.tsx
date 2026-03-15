"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const [clinicName, setClinicName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          clinic_name: clinicName,
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // After signup, the auth callback will handle org creation
    window.location.href = "/auth/callback";
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-[oklch(0.45_0.12_175)] to-[oklch(0.30_0.08_175)] p-12">
        <div className="text-white max-w-md space-y-6">
          <h1 className="text-4xl font-bold">PCMS</h1>
          <p className="text-white/80 text-lg">
            {t("registerDescription")}
          </p>
          <div className="flex flex-wrap gap-2 pt-4">
            {(["consultations", "patients", "grooming", "shop"] as const).map((key) => (
              <span key={key} className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
                {t(`features.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("registerTitle")}</h2>
            <p className="text-muted-foreground mt-1">{t("registerDescription")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">{t("clinicName")}</Label>
              <Input id="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("firstName")}</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("lastName")}</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : t("register")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
