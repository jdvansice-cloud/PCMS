import { getPublicOrgData } from "./actions";
import { BookingForm } from "./booking-form";
import { notFound } from "next/navigation";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicOrgData(slug);
  if (!data || !data.config?.isOnlineBookingEnabled) return notFound();
  return <BookingForm orgData={data} slug={slug} />;
}
