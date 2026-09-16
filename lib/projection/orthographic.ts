// Backward-compatible façade: the canonical engine now lives in projectionEngine/visibility.
// Existing imports keep working unchanged.
export {
  projectToFrontView,
  projectToTopView,
  projectToSideView,
  projectPoint,
  projectedLength,
  buildProjection,
} from "./projectionEngine";
export { faceVisibleForView } from "./hiddenLineEngine";
