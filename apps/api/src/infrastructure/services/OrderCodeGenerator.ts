import type { IOrderCodeGenerator } from "../../application/ports/services/IOrderCodeGenerator.js";
import { randomUUID } from "crypto";

export class OrderCodeGenerator implements IOrderCodeGenerator {
  async next(): Promise<string> {
    const raw = randomUUID().replace(/-/g, "").toUpperCase();
    return `ORD${raw.slice(0, 10)}`;
  }
}
