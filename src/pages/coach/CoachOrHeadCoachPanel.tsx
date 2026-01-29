/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuthStore } from "@/store/authStore";
import CoachPanel from "./CoachPanel";
import HeadCoach from "../head-coach/HeadCoach";

export default function CoachOrHeadCoachPanel() {
  const { user } = useAuthStore();

  const isHeadCoach =
    // user.role propertyni tekshir (agar bo'lsa)
    user?.role?.toLowerCase()?.replace(/_/g, "-") === "head-coach" ||
    // roles array'dan head-coach nomli rol borligini tekshir
    user?.roles?.some((r: any) => {
      const roleName = r?.name
        ?.toLowerCase()
        ?.trim()
        ?.replace(/\s+/g, "-")
        ?.replace(/_/g, "-");
      return (
        roleName === "head-coach" ||
        roleName === "headcoach" ||
        r?.id === 6 || // Head-coach role ID-si 6 (actual)
        r?.name?.toLowerCase() === "head coach" // Exact match: "Head Coach"
      );
    });

  // Debugging ma'lumotlar
  console.log("👤 User:", user?.full_name);
  console.log("🎯 user.role:", user?.role);
  console.log("📋 user.roles array:", user?.roles);
  if (user?.roles && user.roles.length > 0) {
    user.roles.forEach((r: any, idx: number) => {
      console.log(`🔍 Role ${idx}:`, {
        id: r.id,
        name: r.name,
        nameLowercase: r.name?.toLowerCase(),
        nameNormalized: r.name
          ?.toLowerCase()
          ?.trim()
          ?.replace(/\s+/g, "-")
          ?.replace(/_/g, "-"),
      });
    });
  }
  console.log("✅ Is Head Coach:", isHeadCoach);

  if (isHeadCoach) {
    console.log("✨ Head Coach sahifasiga yo'naltirilmoqda...");
    return <HeadCoach />;
  }

  console.log("✨ Coach Panel sahifasiga yo'naltirilmoqda...");
  return <CoachPanel />;
}
