import { getAppointmentFormData } from "../actions";
import { AppointmentForm } from "../appointment-form";

export default async function NewAppointmentPage() {
  const { owners, vets } = await getAppointmentFormData();
  return <AppointmentForm owners={owners} vets={vets} />;
}
