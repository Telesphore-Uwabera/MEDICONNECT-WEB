import { WebSocketServer } from "ws";

const channels = new Map();

function send(socket, event, data) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify({
    event,
    data: typeof data === "string" ? data : JSON.stringify(data),
  }));
}

export function startRealtime(target) {
  const wss = new WebSocketServer(typeof target === "number" ? { host: "127.0.0.1", port: target } : { server: target });
  wss.on("connection", (socket) => {
    const socketId = `${Date.now()}.${Math.floor(Math.random() * 100000)}`;
    socket.channels = new Set();
    send(socket, "pusher:connection_established", { socket_id: socketId, activity_timeout: 120 });

    socket.on("message", (raw) => {
      let message;
      try { message = JSON.parse(String(raw)); } catch { return; }
      if (message.event === "pusher:ping") {
        send(socket, "pusher:pong", {});
        return;
      }
      if (message.event === "pusher:subscribe") {
        const data = typeof message.data === "string" ? JSON.parse(message.data) : message.data;
        const channel = data?.channel;
        if (!channel) return;
        socket.channels.add(channel);
        if (!channels.has(channel)) channels.set(channel, new Set());
        channels.get(channel).add(socket);
        send(socket, "pusher_internal:subscription_succeeded", {});
      }
    });

    socket.on("close", () => {
      for (const channel of socket.channels) channels.get(channel)?.delete(socket);
    });
  });
  return wss;
}

const signals = [];
let signalSeq = 0;

export function publishSignal(room, body) {
  const item = {
    id: ++signalSeq,
    room,
    type: body?.type,
    data: body?.data ?? {},
    from: body?.from || "",
    at: Date.now(),
  };
  signals.push(item);
  // Keep signals for 10 minutes (was 2 min) so slow joiners and rejoiners
  // can still retrieve the offer/answer/ICE candidates they missed.
  const cutoff = Date.now() - 10 * 60 * 1000;
  while (signals.length && (signals.length > 1000 || signals[0].at < cutoff)) signals.shift();
  broadcast(`consultation.${room}`, "webrtc.signal", item);
  return item;
}

export function signalsSince(room, after = 0) {
  const cutoff = Date.now() - 10 * 60 * 1000;
  const roomItems = signals.filter((item) => item.room === room && item.at >= cutoff);
  const maxId = roomItems.reduce((max, item) => Math.max(max, item.id), 0);
  const since = Number(after || 0) > maxId ? 0 : Number(after || 0);
  return roomItems.filter((item) => item.id > since);
}

export function broadcast(channel, event, data) {
  const sockets = channels.get(channel);
  if (!sockets) return;
  const payload = JSON.stringify({
    event,
    channel,
    data: typeof data === "string" ? data : JSON.stringify(data),
  });
  for (const socket of sockets) {
    if (socket.readyState === 1) socket.send(payload);
  }
}

/**
 * Counters for the relay self-check. Counts only: a room or channel name would
 * identify an ongoing consultation, so it stays inside this process.
 */
export function realtimeStats() {
  let sockets = 0;
  for (const subscribers of channels.values()) sockets += subscribers.size;
  return {
    channels: channels.size,
    sockets,
    rooms_awaiting_signal: new Set(signals.map((item) => item.room)).size,
    buffered_signals: signals.length,
  };
}
