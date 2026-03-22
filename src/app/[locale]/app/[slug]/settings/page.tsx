import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { Building2, Users, CreditCard, Tag, Star, Scissors, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SettingsGroup = {
  title: string;
  desc: string;
  icon: LucideIcon;
  links: { label: string; href: string }[];
};

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("settings");
  const base = `/app/${slug}/settings`;

  const groups: SettingsGroup[] = [
    {
      title: t("groupBusiness"),
      desc: t("groupBusinessDesc"),
      icon: Building2,
      links: [
        { label: t("company"), href: `${base}/company` },
        { label: t("branding"), href: `${base}/branding` },
        { label: t("branches"), href: `${base}/branches` },
      ],
    },
    {
      title: t("groupTeam"),
      desc: t("groupTeamDesc"),
      icon: Users,
      links: [
        { label: t("users"), href: `${base}/users` },
        { label: t("roles"), href: `${base}/roles` },
        { label: t("availability"), href: `${base}/availability` },
      ],
    },
    {
      title: t("billing"),
      desc: t("billingDesc"),
      icon: CreditCard,
      links: [
        { label: t("billingPlanLink"), href: `${base}/billing` },
      ],
    },
    {
      title: t("groupPromotions"),
      desc: t("groupPromotionsDesc"),
      icon: Tag,
      links: [
        { label: t("promotions"), href: `${base}/promotions` },
        { label: t("giftCards"), href: `${base}/gift-cards` },
      ],
    },
    {
      title: t("groupLoyalty"),
      desc: t("groupLoyaltyDesc"),
      icon: Star,
      links: [
        { label: t("loyaltyProgram"), href: `${base}/loyalty` },
        { label: t("loyaltyPromotions"), href: `${base}/customer-promotions` },
      ],
    },
    {
      title: t("groomingConfig"),
      desc: t("groomingConfigDesc"),
      icon: Scissors,
      links: [
        { label: t("groomingSettingsLink"), href: `${base}/grooming` },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.title} className="h-full">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2 shrink-0">
                  <g.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{g.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
                </div>
              </div>
              <div className="mt-3 space-y-0.5 pl-[44px]">
                {g.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1 text-sm text-primary hover:underline py-0.5"
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
