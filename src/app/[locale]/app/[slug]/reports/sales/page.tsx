import { getReportFilters } from "../actions";
import { SalesReport } from "./sales-report";

export default async function SalesReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filters = await getReportFilters();

  return <SalesReport slug={slug} filters={filters} />;
}
