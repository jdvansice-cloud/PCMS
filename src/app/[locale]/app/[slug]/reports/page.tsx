import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import {
  DollarSign,
  Users,
  Stethoscope,
  Scissors,
  PawPrint,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ReportGroup = {
  title: string;
  desc: string;
  icon: LucideIcon;
  links: { label: string; href: string }[];
};

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("reports");
  const base = `/app/${slug}/reports`;

  const groups: ReportGroup[] = [
    {
      title: t("groupSales"),
      desc: t("groupSalesDesc"),
      icon: DollarSign,
      links: [
        { label: t("salesSummary"), href: `${base}/sales` },
        { label: t("salesByPaymentMethod"), href: `${base}/sales?view=payment-methods` },
        { label: t("salesComparative"), href: `${base}/sales?comparative=true` },
      ],
    },
    {
      title: t("groupCustomers"),
      desc: t("groupCustomersDesc"),
      icon: Users,
      links: [
        { label: t("customerAcquisition"), href: `${base}/customers?view=acquisition` },
        { label: t("customerRetention"), href: `${base}/customers?view=retention` },
        { label: t("topCustomers"), href: `${base}/customers?view=top` },
      ],
    },
    {
      title: t("groupClinic"),
      desc: t("groupClinicDesc"),
      icon: Stethoscope,
      links: [
        { label: t("clinicThroughput"), href: `${base}/clinic` },
        { label: t("appointmentsByType"), href: `${base}/clinic?view=by-type` },
        { label: t("noShowRate"), href: `${base}/clinic?view=no-shows` },
      ],
    },
    {
      title: t("groupGrooming"),
      desc: t("groupGroomingDesc"),
      icon: Scissors,
      links: [
        { label: t("groomingThroughput"), href: `${base}/grooming` },
        { label: t("groomingByGroomer"), href: `${base}/grooming?view=by-groomer` },
        { label: t("avgGroomingTime"), href: `${base}/grooming?view=avg-time` },
      ],
    },
    {
      title: t("groupKennels"),
      desc: t("groupKennelsDesc"),
      icon: PawPrint,
      links: [
        { label: t("kennelOccupancy"), href: `${base}/kennels` },
        { label: t("kennelTurnover"), href: `${base}/kennels?view=turnover` },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.desc}
                  </p>
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
