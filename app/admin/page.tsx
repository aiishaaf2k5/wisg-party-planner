import { redirect } from "next/navigation";

export default function AdminRootPage() {
  // Always send /admin to the real home page
  redirect("/");
}