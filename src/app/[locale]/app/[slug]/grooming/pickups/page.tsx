import { getDailyPickups } from "../actions";
import { PickupRouteClient } from "./pickup-route-client";

export default async function PickupsPage() {
  const today = new Date().toISOString().split("T")[0];
  try {
    const pickups = await getDailyPickups(today);
    return <PickupRouteClient initialPickups={pickups} initialDate={today} />;
  } catch {
    return <PickupRouteClient initialPickups={[]} initialDate={today} />;
  }
}
