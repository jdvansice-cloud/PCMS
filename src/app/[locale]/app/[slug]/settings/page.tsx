import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Building2, Palette, Users, Shield, Clock, CreditCard, Store, Gift, Tag, Star, Scissors } from "lucide-react";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("settings");
  const base = `/app/${slug}/settings`;

  const sections = [
    { title: t("company"), desc: t("companyDesc"), href: `${base}/company`, icon: Building2 },
    { title: t("branding"), desc: t("brandingDesc"), href: `${base}/branding`, icon: Palette },
    { title: t("users"), desc: t("usersDesc"), href: `${base}/users`, icon: Users },
    { title: t("branches"), desc: t("branchesDesc"), href: `${base}/branches`, icon: Store },
    { title: t("roles"), desc: t("rolesDesc"), href: `${base}/roles`, icon: Shield },
    { title: t("availability"), desc: t("availabilityDesc"), href: `${base}/availability`, icon: Clock },
    { title: t("billing"), desc: t("billingDesc"), href: `${base}/billing`, icon: CreditCard },
    { title: t("giftCards"), desc: t("giftCardsDesc"), href: `${base}/gift-cards`, icon: Gift },
    { title: t("promotions"), desc: t("promotionsDesc"), href: `${base}/promotions`, icon: Tag },
    { title: t("loyaltyProgram"), desc: t("loyaltyDesc"), href: `${base}/loyalty`, icon: Star },
    { title: t("groomingConfig"), desc: t("groomingConfigDesc"), href: `${base}/grooming`, icon: Scissors },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <s.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
