import { getReportFilters } from "../actions";
import { ClinicReport } from "./clinic-report";

export default async function ClinicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const filters = await getReportFilters();

  return <ClinicReport slug={slug} vets={filters.vets} />;
}
