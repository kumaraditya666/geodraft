import { matchIntent, stuckAnswer, type StuckContext, type TutorAnswer } from "./knowledgeBase";

/**
 * TutorAIProvider abstraction. The app only ever talks to this interface,
 * so a future LLM backend can replace the local fallback without touching UI.
 * No API keys live in the frontend — the local provider needs none.
 */

export interface TutorContext {
  route: string;
  wtab: string;
  hasSolid: boolean;
  solidKind: string | null;
  beginner: boolean;
}

export interface TutorAIProvider {
  answer(query: string, ctx: TutorContext): Promise<TutorAnswer>;
}

export class LocalTutorProvider implements TutorAIProvider {
  async answer(query: string, ctx: TutorContext): Promise<TutorAnswer> {
    const q = query.trim();
    if (q.startsWith("__stuck_")) {
      const stuckCtx: StuckContext = { hasSolid: ctx.hasSolid, needsConfirm: false, unclear: [] };
      try {
        const { useStore } = await import("@/store/useStore");
        const st = useStore.getState();
        stuckCtx.needsConfirm = st.needsConfirm;
        stuckCtx.unclear = st.parsed?.unclear ?? [];
      } catch {
        /* store unavailable in tests — use defaults */
      }
      return stuckAnswer(q, stuckCtx);
    }
    const intent = matchIntent(q);
    void ctx;
    return { id: intent.id, body: intent.body, beginnerBody: intent.beginnerBody, actions: intent.actions };
  }
}

export const tutorProvider: TutorAIProvider = new LocalTutorProvider();
