import { getAppointmentBoard } from "./actions";
import { AppointmentBoardClient } from "./appointment-board-client";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const today = new Date().toISOString().split("T")[0];

  try {
    const boardData = await getAppointmentBoard(today);
    return (
      <AppointmentBoardClient
        initialData={JSON.parse(JSON.stringify(boardData))}
        initialDate={today}
        slug={slug}
      />
    );
  } catch {
    return (
      <AppointmentBoardClient
        initialData={{ appointments: [], branchId: "" }}
        initialDate={today}
        slug={slug}
      />
    );
  }
}
