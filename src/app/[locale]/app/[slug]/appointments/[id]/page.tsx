import { notFound } from "next/navigation";
import { getAppointment } from "../actions";
import { AppointmentDetail } from "./appointment-detail";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const appointment = await getAppointment(id);
  if (!appointment) notFound();

  return <AppointmentDetail appointment={JSON.parse(JSON.stringify(appointment))} slug={slug} />;
}
