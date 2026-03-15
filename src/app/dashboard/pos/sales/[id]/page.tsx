import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { getSale } from "../../actions";
import { formatCurrency } from "@/lib/utils";

const paymentLabel: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  YAPPY: "Yappy",
  BANK_TRANSFER: "Transferencia",
};

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pos/sales">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader
          title={`Venta #${sale.saleNumber}`}
          description={`${new Date(sale.createdAt).toLocaleDateString("es-PA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · ${new Date(sale.createdAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-0 shadow-black/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
              Artículos
            </h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">ITBMS</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{line.description}</p>
                        {line.isTaxExempt && (
                          <Badge variant="outline" className="text-xs mt-0.5">Exento</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(line.unitPrice))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(line.subtotal))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(line.itbms))}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(line.lineTotal))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 space-y-1 text-right">
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(sale.subtotal))}</span>
              </div>
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-muted-foreground">ITBMS (7%)</span>
                <span>{formatCurrency(Number(sale.itbms))}</span>
              </div>
              <div className="flex justify-end gap-8 text-lg font-bold border-t pt-2 mt-2">
                <span>Total</span>
                <span>{formatCurrency(Number(sale.total))}</span>
              </div>
            </div>

            {sale.notes && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-xs font-medium text-muted-foreground">Notas</h4>
                <p className="text-sm mt-1">{sale.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-sm border-0 shadow-black/5">
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                Detalles
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Método de Pago</dt>
                  <dd className="text-sm mt-0.5">
                    <Badge variant="outline">{paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Fecha</dt>
                  <dd className="text-sm mt-0.5">
                    {new Date(sale.createdAt).toLocaleDateString("es-PA", { day: "2-digit", month: "long", year: "numeric" })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Hora</dt>
                  <dd className="text-sm mt-0.5">
                    {new Date(sale.createdAt).toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {sale.owner && (
            <Card className="shadow-sm border-0 shadow-black/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Cliente</h3>
                </div>
                <Link href={`/dashboard/owners/${sale.owner.id}`} className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted transition-colors">
                  <div className="rounded-full bg-muted p-2"><User className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium">{sale.owner.firstName} {sale.owner.lastName}</p>
                    {sale.owner.phone && <p className="text-xs text-muted-foreground">{sale.owner.phone}</p>}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
