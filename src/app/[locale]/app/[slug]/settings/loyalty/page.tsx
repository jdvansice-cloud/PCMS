import { getLoyaltyConfig, getTopLoyaltyHolders } from "../actions";
import { LoyaltyClient } from "./loyalty-client";

export default async function LoyaltyPage() {
  const [config, topHolders] = await Promise.all([
    getLoyaltyConfig(),
    getTopLoyaltyHolders(),
  ]);
  return <LoyaltyClient initialConfig={config} initialTopHolders={topHolders} />;
}
