import { notFound } from "next/navigation";
import { getProduct } from "../actions";
import { ProductDetail } from "./product-detail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
