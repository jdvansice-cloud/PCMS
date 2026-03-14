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
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-6">
          <h1 className="text-xl font-bold">PCMS</h1>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4">
          <p className="mb-2 truncate text-xs text-muted-foreground">
            {user.email}
          </p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
