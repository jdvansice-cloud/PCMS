"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";

type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  sidebarColor: string | null;
  fontFamily: string;
};

type Step = "login" | "register" | "otp";

export function PortalOtpLogin({ org }: { org: OrgInfo }) {
  const t = useTranslations("portal.login");
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const bgColor = org.sidebarColor ?? org.primaryColor;

  function setCookies(extras?: { firstName?: string; lastName?: string; phone?: string }) {
    document.cookie = `portal_slug=${org.slug};path=/;max-age=600;samesite=lax`;
    document.cookie = `portal_org_id=${org.id};path=/;max-age=600;samesite=lax`;
    if (extras?.firstName) {
      document.cookie = `portal_first_name=${encodeURIComponent(extras.firstName)};path=/;max-age=600;samesite=lax`;
    }
    if (extras?.lastName) {
      document.cookie = `portal_last_name=${encodeURIComponent(extras.lastName)};path=/;max-age=600;samesite=lax`;
    }
    if (extras?.phone) {
      document.cookie = `portal_phone=${encodeURIComponent(extras.phone)};path=/;max-age=600;samesite=lax`;
    }
  }

  async function sendOtp(targetEmail: string) {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true },
    });
    return authError;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCookies();
    const authError = await sendOtp(email);
    setLoading(false);
    if (authError) {
      setError(t("sendError"));
      return;
    }
    setStep("otp");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCookies({ firstName, lastName, phone });
    const authError = await sendOtp(email);
    setLoading(false);
    if (authError) {
      setError(t("sendError"));
      return;
    }
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const code = otp.join("");
    if (code.length !== 6) {
      setError(t("invalidCode"));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (authError) {
      setError(t("verifyError"));
      setLoading(false);
      return;
    }

    window.location.href = "/auth/portal-callback";
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleResend() {
    setError("");
    setLoading(true);
    const authError = await sendOtp(email);
    setLoading(false);
    if (authError) setError(t("sendError"));
  }

  function switchToRegister() {
    setStep("register");
    setError("");
  }

  function switchToLogin() {
    setStep("login");
    setError("");
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4"
      style={{ backgroundColor: bgColor, fontFamily: org.fontFamily }}
    >
      <div className="mb-8 flex flex-col items-center gap-4">
        {org.logo ? (
          <img
            src={org.logo}
            alt={org.name}
            className="h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-white/20"
          />
        ) : (
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg ring-4 ring-white/20"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#ffffff" }}
          >
            {org.name.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-bold text-white drop-shadow-sm">
          {org.name}
        </h1>
      </div>

      <Card className="w-full max-w-sm shadow-xl">
        <CardContent className="p-6">
          {/* ── Login Step ── */}
          {step === "login" && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold tracking-tight">
                  {t("title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("description")}
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: org.primaryColor }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("sendCode")}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("noAccount")}{" "}
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="font-medium hover:underline"
                    style={{ color: org.primaryColor }}
                  >
                    {t("registerLink")}
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── Register Step ── */}
          {step === "register" && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold tracking-tight">
                  {t("registerTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("registerDescription")}
                </p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("firstName")}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("lastName")}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail">{t("email")}</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: org.primaryColor }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("registerButton")}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("hasAccount")}{" "}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="font-medium hover:underline"
                    style={{ color: org.primaryColor }}
                  >
                    {t("loginLink")}
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── OTP Step ── */}
          {step === "otp" && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold tracking-tight">
                  {t("verifyTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("verifyDescription", { email })}
                </p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold border-2 rounded-lg bg-white border-gray-300 focus:outline-none transition-colors"
                      style={{ borderColor: digit ? org.primaryColor : undefined }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: org.primaryColor }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("verify")}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep("login"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                    className="hover:underline"
                    style={{ color: org.primaryColor }}
                  >
                    {t("changeEmail")}
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="hover:underline"
                    style={{ color: org.primaryColor }}
                  >
                    {t("resendCode")}
                  </button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
