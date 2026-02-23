import type { IEventBus } from "../../application/ports/events/IEventBus.js";
import type { DomainEvent, DomainEventHandler } from "../../application/ports/events/DomainEvent.js";
import type { RedisClient } from "../redis/redisClient.js";
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

export class RedisEventBus implements IEventBus {
  private handlers = new Set<DomainEventHandler>();
  private subscribed = false;

  constructor(
    private pub: RedisClient,
    private sub: RedisClient,
    private channel: string = "hadilao:events",
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const enriched = enrichEvent(event);

    // Local dispatch first (low latency)
    await Promise.all(
      Array.from(this.handlers).map(async (h) => {
        try {
          await h(enriched);
        } catch {
          // ignore
        }
      })
    );

    try {
      await this.pub.publish(this.channel, JSON.stringify(enriched));
    } catch {
      // ignore redis errors in request path
    }
  }

  subscribe(handler: DomainEventHandler): () => void {
    this.handlers.add(handler);

    if (!this.subscribed) {
      this.subscribed = true;
      void this.sub.subscribe(this.channel, async (message: string) => {
        try {
          const event = JSON.parse(message) as DomainEvent;
          await Promise.all(
            Array.from(this.handlers).map(async (h) => {
              try {
                await h(event);
              } catch {
                // ignore
              }
            })
          );
        } catch {
          // ignore bad payloads
        }
      });
    }

    return () => this.handlers.delete(handler);
  }
}
