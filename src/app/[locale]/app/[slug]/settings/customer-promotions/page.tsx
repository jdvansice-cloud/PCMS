import { getCustomerPromotions } from "../actions";
import { CustomerPromotionsClient } from "./customer-promotions-client";

export default async function CustomerPromotionsPage() {
  const initialData = await getCustomerPromotions();
  return <CustomerPromotionsClient initialData={initialData} />;
}
