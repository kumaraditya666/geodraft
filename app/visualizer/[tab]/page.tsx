import WorkspaceLoader from "@/components/workspace/WorkspaceLoader";
import type { WorkspaceTab } from "@/store/useStore";

const SLUGS: Record<string, WorkspaceTab> = {
  projection: "projection",
  construction: "construction",
  dimensions: "dimensions",
  drawing: "sheet",
  export: "export",
};

export function generateStaticParams() {
  return Object.keys(SLUGS).map((tab) => ({ tab }));
}

export default function VisualizerTabPage({ params }: { params: { tab: string } }) {
  const tab: WorkspaceTab = SLUGS[params.tab] ?? "model";
  return <WorkspaceLoader tab={tab} />;
}
