import { notFound } from "next/navigation";
import { getOwner } from "../actions";
import { OwnerDetail } from "./owner-detail";

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = await getOwner(id);

  if (!owner) {
    notFound();
  }

  return <OwnerDetail owner={owner} />;
}
