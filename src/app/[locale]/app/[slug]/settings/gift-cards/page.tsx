import { getGiftCardProducts, getGiftCards } from "../actions";
import { GiftCardsClient } from "./gift-cards-client";

export default async function GiftCardsPage() {
  const [denominations, initialCards] = await Promise.all([
    getGiftCardProducts(),
    getGiftCards(),
  ]);
  return (
    <GiftCardsClient
      denominations={denominations}
      initialCards={initialCards}
    />
  );
}
