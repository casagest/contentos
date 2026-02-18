import { redirect } from "next/navigation";

export const metadata = {
  title: "Command Center — ContentOS",
};

export default function DashboardPage() {
  redirect("/dashboard/command-center");
}
