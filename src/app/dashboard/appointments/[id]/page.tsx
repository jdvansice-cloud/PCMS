import { notFound } from "next/navigation";
import { getAppointment, getAppointmentFormData } from "../actions";
import { AppointmentDetail } from "./appointment-detail";

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [appointment, { owners, vets }] = await Promise.all([
    getAppointment(id),
    getAppointmentFormData(),
  ]);
  if (!appointment) notFound();
  return <AppointmentDetail appointment={appointment} owners={owners} vets={vets} />;
}
