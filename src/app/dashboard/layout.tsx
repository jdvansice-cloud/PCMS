import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  Dog,
  LayoutDashboard,
  Package,
  Scissors,
  ShoppingCart,
  Users,
} from "lucide-react";
import { LogoLight } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignOutButton } from "./sign-out-button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/dashboard/owners", icon: Users },
  { name: "Mascotas", href: "/dashboard/pets", icon: Dog },
  { name: "Citas", href: "/dashboard/appointments", icon: Calendar },
  { name: "Peluquería", href: "/dashboard/grooming", icon: Scissors },
  { name: "Punto de Venta", href: "/dashboard/pos", icon: ShoppingCart },
  { name: "Inventario", href: "/dashboard/inventory", icon: Package },
  { name: "Servicios", href: "/dashboard/services", icon: ClipboardList },
];

function getInitials(email: string): string {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initials = getInitials(user.email ?? "U");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-[260px] flex-col bg-[oklch(0.35_0.08_175)]">
        {/* Logo */}
        <div className="flex h-16 items-center px-5">
          <LogoLight size="default" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-white/15 text-white">
              <AvatarFallback className="bg-white/15 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white/90">
                {user.email}
              </p>
              <p className="text-xs text-white/50">Administrador</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
