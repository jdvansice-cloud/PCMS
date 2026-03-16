import { getBranches } from "../actions";
import { BranchesClient } from "./branches-client";

export default async function BranchesPage() {
  const initialBranches = await getBranches();
  return <BranchesClient initialBranches={initialBranches} />;
}
