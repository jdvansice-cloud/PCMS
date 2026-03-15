import { getOwnersForSelect } from "../actions";
import { PetForm } from "../pet-form";

export default async function NewPetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ownerId?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const owners = await getOwnersForSelect();

  return <PetForm slug={slug} owners={owners} defaultOwnerId={sp.ownerId} />;
}
