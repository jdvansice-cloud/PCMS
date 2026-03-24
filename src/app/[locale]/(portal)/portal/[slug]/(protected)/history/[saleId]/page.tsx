"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getSaleReceipt } from "../../actions";
import { Printer } from "lucide-react";

type Receipt = Awaited<ReturnType<typeof getSaleReceipt>>;

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function PortalReceiptPage() {
  const t = useTranslations("portal.history");
  const params = useParams();
  const { organization } = usePortalTenant();
  const [receipt, setReceipt] = useState<Receipt>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSaleReceipt(params.saleId as string).then((r) => { setReceipt(r); setLoading(false); });
  }, [params.saleId]);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  if (!receipt) return <p className="text-muted-foreground">{t("notFound")}</p>;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/portal/${organization.slug}/history`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; {t("backToHistory")}
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> {t("print")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">#{receipt.saleNumber}</h1>
              <p className="text-sm text-muted-foreground">
                {new Date(receipt.createdAt).toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <Badge variant="outline">{receipt.status}</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("item")}</TableHead>
                <TableHead className="text-right">{t("qty")}</TableHead>
                <TableHead className="text-right">{t("price")}</TableHead>
                <TableHead className="text-right">{t("lineTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(line.unitPrice)}</TableCell>
                  <TableCell className="text-right">{fmt(line.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{t("subtotal")}</span>
              <span>{fmt(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ITBMS</span>
              <span>{fmt(receipt.itbms)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t("discount")}</span>
                <span>-{fmt(receipt.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>{t("total")}</span>
              <span>{fmt(receipt.total)}</span>
            </div>
          </div>

          {/* Payments */}
          <div className="mt-4 border-t pt-3">
            <h3 className="text-sm font-semibold mb-2">{t("payments")}</h3>
            <div className="space-y-1">
              {receipt.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <Badge variant="secondary" className="text-xs">{p.paymentMethod}</Badge>
                  <span>{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
