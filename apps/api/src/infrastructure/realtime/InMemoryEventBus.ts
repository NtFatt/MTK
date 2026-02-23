import type { IEventBus } from "../../application/ports/events/IEventBus.js";
import type { DomainEvent, DomainEventHandler } from "../../application/ports/events/DomainEvent.js";
import { requestContext } from "../observability/context.js";

function enrichEvent(event: DomainEvent): DomainEvent {
  const ctx = requestContext.get();
  if (!ctx) return event;

  const meta: any = { ...(event.meta ?? {}) };
  if (ctx.requestId) meta.rid = ctx.requestId;
  if (ctx.actor) meta.actor = ctx.actor;
  if (ctx.ip) meta.ip = ctx.ip;
  if (ctx.userAgent) meta.userAgent = ctx.userAgent;

  if (Object.keys(meta).length === 0) return event;
  return { ...event, meta };
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Set<DomainEventHandler>();

  async publish(event: DomainEvent): Promise<void> {
    const enriched = enrichEvent(event);

    // fan-out (best-effort)
    await Promise.all(
      Array.from(this.handlers).map(async (h) => {
        try {
          await h(enriched);
        } catch {
          // swallow - event bus should not crash request path
        }
      })
    );
  }

  subscribe(handler: DomainEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
