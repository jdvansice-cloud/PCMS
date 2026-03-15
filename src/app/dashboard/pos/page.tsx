import { getPosData } from "./actions";
import { PosTerminal } from "./pos-terminal";

export default async function PosPage() {
  const { products, services, owners } = await getPosData();
  return <PosTerminal products={products} services={services} owners={owners} />;
}
