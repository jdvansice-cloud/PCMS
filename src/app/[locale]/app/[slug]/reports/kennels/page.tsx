import { KennelsReport } from "./kennels-report";

export default async function KennelsReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <KennelsReport slug={slug} />;
}
