"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getMyLoyalty } from "../actions";
import { Star } from "lucide-react";

type LoyaltyData = Awaited<ReturnType<typeof getMyLoyalty>>;

export default function PortalLoyaltyPage() {
  const t = useTranslations("portal.loyalty");
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLoyalty().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  if (!data) return null;

  const typeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    EARNED: "default",
    REDEEMED: "secondary",
    EXPIRED: "destructive",
    ADJUSTED: "outline",
    REVERSED: "destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardContent className="p-6 text-center">
          <Star className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
          <p className="text-4xl font-bold">{data.balance}</p>
          <p className="text-sm text-muted-foreground">{t("pointsBalance")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm mb-3">{t("transactions")}</h2>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead className="text-right">{t("points")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeColors[tx.type] ?? "outline"} className="text-xs">
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{tx.note ?? "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
