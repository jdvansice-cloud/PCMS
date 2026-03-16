import { getUsers, getRoles } from "../actions";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const [initialUsers, initialRoles] = await Promise.all([getUsers(), getRoles()]);
  return <UsersClient initialUsers={initialUsers} initialRoles={initialRoles} />;
}
