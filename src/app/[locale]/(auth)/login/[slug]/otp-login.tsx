"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type OrgBranding = {
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  darkMode: boolean;
  customLoginBg: string | null;
};

type Step = "email" | "otp";

export function BrandedOtpLogin({ org }: { org: OrgBranding }) {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (authError) {
      setError(t("otpSendError"));
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
      setError(t("otpInvalid"));
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
      setError(t("otpVerifyError"));
      setLoading(false);
      return;
    }

    window.location.href = "/auth/callback";
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
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

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleResend() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (authError) {
      setError(t("otpSendError"));
    }
  }

  const brandStyle = {
    "--brand-primary": org.primaryColor,
    "--brand-secondary": org.secondaryColor,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen" style={brandStyle}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
        style={{
          background: org.customLoginBg
            ? `url(${org.customLoginBg}) center/cover no-repeat`
            : `linear-gradient(135deg, ${org.primaryColor}, ${org.secondaryColor})`,
        }}
      >
        <div className="text-white max-w-md space-y-6 text-center">
          {org.logo ? (
            <img
              src={org.logo}
              alt={org.name}
              className="h-24 w-24 rounded-full object-cover mx-auto shadow-lg"
            />
          ) : (
            <div
              className="h-24 w-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              {org.name.charAt(0)}
            </div>
          )}
          <h1 className="text-3xl font-bold">{org.name}</h1>
        </div>
      </div>

      {/* Right form */}
      <div
        className={`flex flex-1 items-center justify-center p-6 sm:p-12 ${org.darkMode ? "bg-gray-950 text-white" : "bg-white"}`}
        style={{ fontFamily: org.fontFamily }}
      >
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            {org.logo ? (
              <img
                src={org.logo}
                alt={org.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: org.primaryColor }}
              >
                {org.name.charAt(0)}
              </div>
            )}
            <h2 className="text-xl font-bold">{org.name}</h2>
          </div>

          {step === "email" ? (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {t("otpTitle")}
                </h2>
                <p className={`mt-1 ${org.darkMode ? "text-gray-400" : "text-muted-foreground"}`}>
                  {t("otpDescription")}
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
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
                  {loading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("sendOtp")}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {t("otpVerifyTitle")}
                </h2>
                <p className={`mt-1 ${org.darkMode ? "text-gray-400" : "text-muted-foreground"}`}>
                  {t("otpVerifyDescription", { email })}
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
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
                      className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none transition-colors ${
                        org.darkMode
                          ? "bg-gray-900 border-gray-700 text-white"
                          : "bg-white border-gray-300"
                      }`}
                      style={{
                        borderColor: digit ? org.primaryColor : undefined,
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: org.primaryColor }}
                  disabled={loading}
                >
                  {loading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {t("verifyOtp")}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp(["", "", "", "", "", ""]);
                      setError("");
                    }}
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
                    {t("resendOtp")}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
