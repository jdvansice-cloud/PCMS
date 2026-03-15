import { notFound } from "next/navigation";
import { getProduct } from "../actions";
import { ProductDetail } from "./product-detail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // Serialize to convert Prisma Decimal to plain numbers
  return <ProductDetail product={JSON.parse(JSON.stringify(product))} slug={slug} />;
}
