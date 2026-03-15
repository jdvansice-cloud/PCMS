import { notFound } from "next/navigation";
import { getOwner } from "../actions";
import { ClientDetail } from "./client-detail";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const owner = await getOwner(id);
  if (!owner) notFound();

  return <ClientDetail owner={JSON.parse(JSON.stringify(owner))} slug={slug} />;
}
