import { redirect } from "next/navigation";

export default function LegacyPositionsPage() {
  redirect("/app/positions");
}
