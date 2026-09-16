import type { Vec3, ViewKind } from "@/types";
import { isFaceVisible } from "./visibility";

/** Thin engine façade so `orthographic.ts` keeps its historic export. */
export function faceVisibleForView(normal: Vec3, view: ViewKind): boolean {
  return isFaceVisible(normal, view);
}
