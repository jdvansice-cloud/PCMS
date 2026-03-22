import { getTranslations } from "next-intl/server";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ConfirmationPage() {
  const t = await getTranslations("booking");
  return (
    <Card className="text-center">
      <CardContent className="py-12 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">{t("bookingConfirmed")}</h2>
        <p className="text-muted-foreground">{t("bookingConfirmedMsg")}</p>
      </CardContent>
    </Card>
  );
}
