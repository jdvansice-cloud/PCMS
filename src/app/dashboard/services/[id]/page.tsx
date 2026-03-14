import { notFound } from "next/navigation";
import { getService } from "../actions";
import { ServiceDetail } from "./service-detail";

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();
  return <ServiceDetail service={service} />;
}
