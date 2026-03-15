import { notFound } from "next/navigation";
import { getService } from "../actions";
import { ServiceDetail } from "./service-detail";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  return <ServiceDetail service={JSON.parse(JSON.stringify(service))} slug={slug} />;
}
