// KisanJod - Real-time Server-Sent Events (SSE) Stream
import { NextRequest } from "next/server";
import { syncBus, SyncPayload } from "@/lib/syncBus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let listener: ((data: SyncPayload) => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send immediate connection confirmation
      const initPayload = JSON.stringify({ type: "CONNECTED", timestamp: Date.now() });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initPayload}\n\n`));

      // 2. Attach real-time listener for zero-delay event dispatch
      listener = (data: SyncPayload) => {
        try {
          const chunk = `event: sync\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream closed by client
        }
      };
      syncBus.on("kisanjod_event", listener);

      // 3. Keep-alive heartbeat every 20 seconds to prevent proxy timeout
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 20000);
    },
    cancel() {
      if (listener) {
        syncBus.off("kisanjod_event", listener);
      }
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

