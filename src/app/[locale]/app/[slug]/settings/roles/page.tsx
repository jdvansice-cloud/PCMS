import { getRoles } from "../actions";
import { RolesClient } from "./roles-client";

export default async function RolesPage() {
  const initialRoles = await getRoles();
  return <RolesClient initialRoles={initialRoles} />;
}
