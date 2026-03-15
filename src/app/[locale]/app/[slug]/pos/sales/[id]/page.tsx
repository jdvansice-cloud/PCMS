import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { getSale } from "../../actions";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  const base = `/app/${slug}/pos`;

  return (
    <div className="space-y-6">
      <PageHeader title={`Venta #${sale.saleNumber}`}>
        <Link href={`${base}/sales`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Historial
          </Button>
        </Link>
      </PageHeader>

      <Card className="shadow-sm border-0 shadow-black/5 max-w-lg">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span className="font-bold text-lg">#{sale.saleNumber}</span>
            </div>
            <Badge variant="secondary">{sale.status}</Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {new Date(sale.createdAt).toLocaleDateString("es-PA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          {sale.owner && (
            <div className="text-sm">
              <span className="text-muted-foreground">Cliente:</span>{" "}
              {sale.owner.firstName} {sale.owner.lastName}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            {sale.lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between text-sm">
                <div>
                  <span>{line.description}</span>
                  {line.quantity > 1 && (
                    <span className="text-muted-foreground ml-1">x{line.quantity}</span>
                  )}
                </div>
                <span className="font-medium">{formatCurrency(Number(line.lineTotal))}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(sale.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ITBMS (7%)</span>
              <span>{formatCurrency(Number(sale.itbms))}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1">
              <span>Total</span>
              <span>{formatCurrency(Number(sale.total))}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            {sale.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{p.paymentMethod}</span>
                <span>{formatCurrency(Number(p.amount))}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
