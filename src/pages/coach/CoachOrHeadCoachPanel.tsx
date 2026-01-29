import { useAuthStore } from "@/store/authStore";
import CoachPanel from "./CoachPanel";
import HeadCoach from "../head-coach/HeadCoach";

export default function CoachOrHeadCoachPanel() {
  const { user } = useAuthStore();

  // Check both the single role property and the roles array for "head-coach"
  // Convert to lowercase va "-" vs "_" xatolarini tekshir
  const isHeadCoach =
    user?.role?.toLowerCase()?.replace(/_/g, "-") === "head-coach" ||
    user?.roles?.some(
      (r) => r.name?.toLowerCase()?.replace(/_/g, "-") === "head-coach",
    );

  console.log("👤 User:", user?.full_name);
  console.log("🎯 Role:", user?.role);
  console.log("📋 Roles array:", user?.roles);
  console.log("✅ Is Head Coach:", isHeadCoach);

  if (isHeadCoach) {
    return <HeadCoach />;
  }

  return <CoachPanel />;
}
