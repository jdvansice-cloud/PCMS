import { getOwnersForSelect } from "../actions";
import { PetForm } from "../pet-form";

export default async function NewPetPage({
  searchParams,
}: {
  searchParams: Promise<{ ownerId?: string }>;
}) {
  const params = await searchParams;
  const owners = await getOwnersForSelect();

  return <PetForm owners={owners} defaultOwnerId={params.ownerId} />;
}
