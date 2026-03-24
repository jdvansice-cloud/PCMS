import { CustomersReport } from "./customers-report";

export default async function CustomersReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CustomersReport slug={slug} />;
}
