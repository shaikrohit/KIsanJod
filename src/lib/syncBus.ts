import { EventEmitter } from "events";

// Global singleton across hot-reloads in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __kisanjodSyncBus: EventEmitter | undefined;
}

export const syncBus: EventEmitter = globalThis.__kisanjodSyncBus || new EventEmitter();
syncBus.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalThis.__kisanjodSyncBus = syncBus;
}

export interface SyncPayload {
  type: string;
  centerId?: string;
  farmerId?: string;
  bookingId?: string;
  tokenNumber?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export function notifySync(payload: SyncPayload) {
  const event = {
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  };
  syncBus.emit("kisanjod_event", event);
}
