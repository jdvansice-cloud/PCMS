import { getGiftCards } from "../actions";
import { GiftCardsClient } from "./gift-cards-client";

export default async function GiftCardsPage() {
  const initialData = await getGiftCards();
  return <GiftCardsClient initialData={initialData} />;
}
