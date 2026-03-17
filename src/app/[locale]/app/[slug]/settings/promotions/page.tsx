import { getPromotions } from "../actions";
import { PromotionsClient } from "./promotions-client";

export default async function PromotionsPage() {
  const initialData = await getPromotions();
  return <PromotionsClient initialData={initialData} />;
}
