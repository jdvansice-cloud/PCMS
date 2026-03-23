import { getGroomingBoard, getGroomers, getGroomingFormData, getScheduledGroomingAppointments } from "./actions";
import { GroomingBoardClient } from "./grooming-board-client";

export default async function GroomingPage() {
  const today = new Date().toISOString().split("T")[0];

  try {
    const [boardData, groomers, formData, scheduled] = await Promise.all([
      getGroomingBoard(today),
      getGroomers(),
      getGroomingFormData(),
      getScheduledGroomingAppointments(),
    ]);
    return (
      <GroomingBoardClient
        initialData={boardData}
        initialGroomers={groomers}
        initialFormData={JSON.parse(JSON.stringify(formData))}
        initialScheduled={JSON.parse(JSON.stringify(scheduled))}
        initialDate={today}
      />
    );
  } catch {
    return (
      <GroomingBoardClient
        initialData={{ sessions: [], kennels: [], availableKennels: {}, freeKennels: [], branchId: "" }}
        initialGroomers={[]}
        initialFormData={{ owners: [], services: [], kennels: [], groomers: [], branchId: "" }}
        initialScheduled={[]}
        initialDate={today}
      />
    );
  }
}
