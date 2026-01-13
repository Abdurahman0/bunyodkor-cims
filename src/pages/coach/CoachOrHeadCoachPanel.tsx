import { useAuthStore } from "@/store/authStore";
import CoachPanel from "./CoachPanel";
import HeadCoach from "../head-coach/HeadCoach";

export default function CoachOrHeadCoachPanel() {
  const { user } = useAuthStore();

  if (user?.role === 'head-coach') {
    return <HeadCoach />;
  }

  return <CoachPanel />;
}
