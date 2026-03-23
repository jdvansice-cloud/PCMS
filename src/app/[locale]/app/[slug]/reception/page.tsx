import { getTodaysScheduledAppointments } from "./actions";
import { ReceptionClient } from "./reception-client";

export default async function ReceptionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTodaysScheduledAppointments();

  return (
    <ReceptionClient
      data={JSON.parse(JSON.stringify(data))}
      slug={slug}
    />
  );
}
