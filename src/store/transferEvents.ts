import { EventEmitter } from "node:events";
import type { Transfer } from "../types.js";

// Singleton event bus: TransferService emits, SSE route streams.
// Keeps orchestration decoupled from HTTP.
export const transferEvents = new EventEmitter();
transferEvents.setMaxListeners(100);

export function emitTransfer(t: Transfer): void {
  transferEvents.emit("transfer", t);
  transferEvents.emit(`transfer:${t.transferId}`, t);
}
