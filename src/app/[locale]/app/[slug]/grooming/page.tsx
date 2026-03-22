import { getGroomingBoard, getGroomers } from "./actions";
import { GroomingBoardClient } from "./grooming-board-client";

export default async function GroomingPage() {
  const today = new Date().toISOString().split("T")[0];

  try {
    const [boardData, groomers] = await Promise.all([
      getGroomingBoard(today),
      getGroomers(),
    ]);
    return (
      <GroomingBoardClient
        initialData={boardData}
        initialGroomers={groomers}
        initialDate={today}
      />
    );
  } catch {
    return (
      <GroomingBoardClient
        initialData={{ sessions: [], kennels: [], availableKennels: {}, branchId: "" }}
        initialGroomers={[]}
        initialDate={today}
      />
    );
  }
}
