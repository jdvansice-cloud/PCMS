"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ClipboardList,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { createSale } from "./actions";
import type { PaymentMethod } from "@/generated/prisma/client";

type CartItem = {
  key: string;
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxExempt: boolean;
};

type PosData = {
  products: {
    id: string;
    name: string;
    price: unknown;
    stock: number;
    isTaxExempt: boolean;
    category: string;
  }[];
  services: {
    id: string;
    name: string;
    price: unknown;
    isTaxExempt: boolean;
    type: string;
  }[];
  owners: { id: string; firstName: string; lastName: string }[];
};

export function PosTerminal({ data, slug }: { data: PosData; slug: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "services">("products");
  const [ownerId, setOwnerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);

  const base = `/app/${slug}/pos`;

  const filteredProducts = data.products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredServices = data.services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  function addProduct(p: PosData["products"][0]) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          key: `p-${p.id}`,
          productId: p.id,
          description: p.name,
          quantity: 1,
          unitPrice: Number(p.price),
          isTaxExempt: p.isTaxExempt,
        },
      ];
    });
  }

  function addService(s: PosData["services"][0]) {
    setCart((prev) => {
      const existing = prev.find((i) => i.serviceId === s.id);
      if (existing) return prev;
      return [
        ...prev,
        {
          key: `s-${s.id}`,
          serviceId: s.id,
          description: s.name,
          quantity: 1,
          unitPrice: Number(s.price),
          isTaxExempt: s.isTaxExempt,
        },
      ];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleCharge() {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const result = await createSale({
        ownerId: ownerId || undefined,
        items: cart.map(({ key, ...rest }) => rest),
        paymentMethod,
      });
      setCart([]);
      setOwnerId("");
      router.push(`${base}/sales/${result.saleId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Punto de Venta">
        <Link href={`${base}/sales`}>
          <Button variant="outline" size="sm">
            Historial de Ventas
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Item browser */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar productos o servicios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={tab === "products" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("products")}
              className="gap-1.5"
            >
              <Package className="h-3.5 w-3.5" /> Productos
            </Button>
            <Button
              variant={tab === "services" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("services")}
              className="gap-1.5"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Servicios
            </Button>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {tab === "products"
              ? filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold">
                        {formatCurrency(Number(p.price))}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {p.stock}
                      </Badge>
                    </div>
                  </button>
                ))
              : filteredServices.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addService(s)}
                    className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <span className="text-sm font-semibold">
                      {formatCurrency(Number(s.price))}
                    </span>
                  </button>
                ))}
          </div>
        </div>

        {/* Cart */}
        <Card className="lg:col-span-2 shadow-sm border-0 shadow-black/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Carrito</h3>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Agrega productos o servicios
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.key, -1)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.key, 1)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Cliente (opcional)</label>
                <Select value={ownerId} onValueChange={(v) => setOwnerId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.firstName} {o.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Método de Pago</label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => v && setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="CARD">Tarjeta</SelectItem>
                    <SelectItem value="YAPPY">Yappy</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <Button
                onClick={handleCharge}
                disabled={cart.length === 0 || loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Procesando..." : `Cobrar ${formatCurrency(total)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
