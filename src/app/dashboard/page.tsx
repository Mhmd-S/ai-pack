import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <p>Welcome, {session.user?.email}!</p>
    </div>
  );
}