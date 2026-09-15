"use client";
import { useStore } from "@/store/useStore";
import LandingPage from "@/components/landing/LandingPage";
import Workspace from "@/components/workspace/Workspace";

export default function Page() {
  const screen = useStore((s) => s.screen);
  if (screen === "landing") return <LandingPage />;
  return <Workspace />;
}
