"use client";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import type { WorkspaceTab } from "@/store/useStore";
import Workspace from "@/components/workspace/Workspace";

export default function WorkspaceLoader({ tab }: { tab: WorkspaceTab }) {
  useEffect(() => {
    const st = useStore.getState();
    if (!st.solid) {
      // fresh visit / refresh with empty state: boot the default demo problem (never an empty screen)
      st.generate();
    }
    useStore.getState().set({ screen: "workspace", sidebar: "Visualizer", wtab: tab });
    if (tab === "construction") {
      useStore.getState().set({ stepIndex: 0, playing: true });
    }
    if (tab === "sheet") {
      useStore.getState().set({ sheetOpen: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return <Workspace />;
}
