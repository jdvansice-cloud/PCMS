"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyGiftCards } from "../actions";
import { Gift } from "lucide-react";

type GiftCard = Awaited<ReturnType<typeof getMyGiftCards>>[number];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export default function PortalGiftCardsPage() {
  const t = useTranslations("portal.giftCards");
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyGiftCards().then((c) => { setCards(c); setLoading(false); });
  }, []);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    DEPLETED: "secondary",
    EXPIRED: "destructive",
    DISABLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("noCards")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {card.code}
                  </code>
                  <Badge variant={statusColors[card.status] ?? "outline"} className="text-xs">
                    {card.status}
                  </Badge>
                </div>
                <div className="text-center py-3">
                  <p className="text-3xl font-bold">{fmt(card.balance)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("of")} {fmt(card.initialBalance)}
                  </p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("purchased")}: {new Date(card.createdAt).toLocaleDateString()}</span>
                  {card.expiresAt && (
                    <span>{t("expires")}: {new Date(card.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
