import { notFound } from "next/navigation";
import { getPet } from "../actions";
import { PetDetail } from "./pet-detail";

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const pet = await getPet(id);
  if (!pet) notFound();

  return <PetDetail pet={JSON.parse(JSON.stringify(pet))} slug={slug} />;
}
