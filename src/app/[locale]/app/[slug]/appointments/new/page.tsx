import { getAppointmentFormData } from "../actions";
import { AppointmentForm } from "../appointment-form";

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getAppointmentFormData();

  return <AppointmentForm data={data} slug={slug} />;
}
