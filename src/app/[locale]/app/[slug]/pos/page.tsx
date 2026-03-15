import { getPosData } from "./actions";
import { PosTerminal } from "./pos-terminal";

export default async function PosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPosData();

  return <PosTerminal data={data} slug={slug} />;
}
