"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Package, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { createSale } from "./actions";
import { formatCurrency } from "@/lib/utils";
import type { SaleFormData } from "@/lib/validators/sale";

type Product = { id: string; name: string; price: unknown; isTaxExempt: boolean; stock: number; category: string };
type Service = { id: string; name: string; price: unknown; isTaxExempt: boolean; type: string };
type Owner = { id: string; firstName: string; lastName: string };

type CartItem = {
  key: string;
  productId?: string;
  serviceId?: string;
  description: string;
  unitPrice: number;
  quantity: number;
  isTaxExempt: boolean;
  type: "product" | "service";
};

const paymentMethods = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "YAPPY", label: "Yappy" },
  { value: "BANK_TRANSFER", label: "Transferencia" },
] as const;

export function PosTerminal({ products, services, owners }: { products: Product[]; services: Service[]; owners: Owner[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"products" | "services">("products");
  const [paymentMethod, setPaymentMethod] = useState<SaleFormData["paymentMethod"]>("CASH");
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function addProduct(product: Product) {
    const price = Number(product.price);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        key: `p-${product.id}`,
        productId: product.id,
        description: product.name,
        unitPrice: price,
        quantity: 1,
        isTaxExempt: product.isTaxExempt,
        type: "product" as const,
      }];
    });
  }

  function addService(service: Service) {
    const price = Number(service.price);
    setCart((prev) => {
      const existing = prev.find((i) => i.serviceId === service.id);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        key: `s-${service.id}`,
        serviceId: service.id,
        description: service.name,
        unitPrice: price,
        quantity: 1,
        isTaxExempt: service.isTaxExempt,
        type: "service" as const,
      }];
    });
  }

  function updateQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleSubmit() {
    if (cart.length === 0) return;
    setSaving(true);
    setErrors({});

    const data: SaleFormData = {
      ownerId,
      paymentMethod,
      notes,
      lines: cart.map((item) => ({
        productId: item.productId || "",
        serviceId: item.serviceId || "",
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isTaxExempt: item.isTaxExempt,
      })),
    };

    const result = await createSale(data);
    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setSaving(false);
    }
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <PageHeader title="Punto de Venta" description="Registrar una venta">
        <Link href="/dashboard/pos/sales">
          <Button variant="outline" className="gap-2">
            <Receipt className="h-4 w-4" />
            Historial de Ventas
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Product/Service catalog — left side */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos o servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={tab === "products" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("products")}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Productos ({filteredProducts.length})
            </Button>
            <Button
              variant={tab === "services" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("services")}
              className="gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              Servicios ({filteredServices.length})
            </Button>
          </div>

          {tab === "products" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">
                  No se encontraron productos
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    disabled={product.stock <= 0}
                    className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock}
                        {product.isTaxExempt && " · Exento"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold ml-2">{formatCurrency(Number(product.price))}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredServices.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">
                  No se encontraron servicios
                </p>
              ) : (
                filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => addService(service)}
                    className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.isTaxExempt && "Exento"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold ml-2">{formatCurrency(Number(service.price))}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cart — right side */}
        <Card className="lg:col-span-2 shadow-sm border-0 shadow-black/5 self-start lg:sticky lg:top-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Carrito</h2>
              {cart.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Agrega productos o servicios para comenzar
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.key} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity} = {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.key, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.key, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.key)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerId">Cliente (opcional)</Label>
                <select id="ownerId" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectClass}>
                  <option value="">Sin cliente</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => (
                    <Button
                      key={m.value}
                      type="button"
                      variant={paymentMethod === m.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod(m.value)}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {errors.lines && <p className="text-sm text-destructive">{errors.lines[0]}</p>}

              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0 || saving}
                onClick={handleSubmit}
              >
                {saving ? "Procesando..." : `Cobrar ${formatCurrency(cartTotal)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
