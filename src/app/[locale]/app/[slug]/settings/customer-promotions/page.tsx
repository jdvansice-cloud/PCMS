import { getLoyaltyPromotions } from "../actions";
import { LoyaltyPromotionsClient } from "./customer-promotions-client";

export default async function LoyaltyPromotionsPage() {
  const initialData = await getLoyaltyPromotions();
  return <LoyaltyPromotionsClient initialData={initialData} />;
}
