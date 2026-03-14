"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { LogoLight } from "@/components/logo";
import { PawPrint, Stethoscope, Scissors, ShoppingBag } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-[oklch(0.40_0.08_175)] to-[oklch(0.30_0.10_185)] p-12 text-white">
        <LogoLight size="lg" />

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Gestión integral<br />para tu clínica veterinaria
          </h1>
          <p className="text-lg text-white/70 max-w-md">
            Clínica, tienda y peluquería en un solo lugar. Simple, moderno y hecho para Panamá.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <FeatureChip icon={Stethoscope} label="Consultas" />
            <FeatureChip icon={PawPrint} label="Pacientes" />
            <FeatureChip icon={Scissors} label="Peluquería" />
            <FeatureChip icon={ShoppingBag} label="Tienda" />
          </div>
        </div>

        <p className="text-sm text-white/40">
          PCMS v0.1 — Pet Clinic Management System
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Bienvenido</h2>
            <p className="text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-lg text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
      <Icon className="h-5 w-5 text-white/80" />
      <span className="text-sm font-medium text-white/80">{label}</span>
    </div>
  );
}
