import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Planner from "@/components/planner";

export default async function PlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/planner");

  return <Planner userId={user.id} />;
}
