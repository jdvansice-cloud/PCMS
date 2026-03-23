import { getEndOfDayReport } from "../actions";
import { ClosingReport } from "./closing-report";

export default async function ClosingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;
  const report = await getEndOfDayReport(date);

  return <ClosingReport report={report} slug={slug} />;
}
