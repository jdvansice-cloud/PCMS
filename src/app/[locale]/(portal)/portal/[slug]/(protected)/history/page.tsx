"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getMyPurchases } from "../actions";
import { Receipt } from "lucide-react";

type Sale = Awaited<ReturnType<typeof getMyPurchases>>[number];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function PortalHistoryPage() {
  const t = useTranslations("portal.history");
  const { organization } = usePortalTenant();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPurchases().then((s) => { setSales(s); setLoading(false); });
  }, []);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("noPurchases")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => (
            <Link key={sale.id} href={`/portal/${organization.slug}/history/${sale.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      #{sale.saleNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleDateString()} &middot; {sale.lineCount} {t("items")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{fmt(sale.total)}</p>
                    <Badge variant="outline" className="text-xs">{sale.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
