import { getReportFilters } from "../actions";
import { GroomingReport } from "./grooming-report";

export default async function GroomingReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filters = await getReportFilters();

  return <GroomingReport slug={slug} groomers={filters.groomers} />;
}
