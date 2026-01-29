import { useAuthStore } from "@/store/authStore";
import CoachPanel from "./CoachPanel";
import HeadCoach from "../head-coach/HeadCoach";

export default function CoachOrHeadCoachPanel() {
  const { user } = useAuthStore();

  // Check both the single role property and the roles array
  const isHeadCoach =
    user?.role === "head-coach" ||
    (user?.roles &&
      user.roles.some((r) => r.name.toLowerCase() === "head-coach"));

  if (isHeadCoach) {
    return <HeadCoach />;
  }

  return <CoachPanel />;
}
