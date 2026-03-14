import { notFound } from "next/navigation";
import { getPet, getOwnersForSelect } from "../actions";
import { PetDetail } from "./pet-detail";

export default async function PetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pet, owners] = await Promise.all([getPet(id), getOwnersForSelect()]);

  if (!pet) {
    notFound();
  }

  return <PetDetail pet={pet} owners={owners} />;
}
