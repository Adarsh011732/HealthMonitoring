import { session } from "../../lib/session";
import { redirect } from "next/navigation";
import Workspace from "../../components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await session();
  if (!user) redirect("/login");
  return <Workspace name={user.user.name} email={user.user.email} />;
}
