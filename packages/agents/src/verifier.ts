import type { TaskSpec } from "./execute.js";

// v1 verifier: cheap heuristic checks on the result. Documented as v1 — trustless
// verification (optimistic challenge window, later zk) is the headline roadmap item.
export function verify(spec: TaskSpec, result: string): boolean {
  if (result.length === 0) return false;

  switch (spec.kind) {
    case "summarize":
      // A summary must be non-empty and shorter than the input.
      return result.length < spec.input.length;
    case "classify":
      // Expect a short label, not an essay.
      return result.length <= 64;
    case "extract":
      // Expect parseable JSON.
      try {
        JSON.parse(result);
        return true;
      } catch {
        return false;
      }
    default:
      return true;
  }
}
