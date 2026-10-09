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
  const cutoff = Date.now() - 2 * 60 * 1000;
  while (signals.length && (signals.length > 400 || signals[0].at < cutoff)) signals.shift();
  broadcast(`consultation.${room}`, "webrtc.signal", item);
  return item;
}

export function signalsSince(room, after = 0) {
  const cutoff = Date.now() - 2 * 60 * 1000;
  return signals.filter((item) => item.room === room && item.id > Number(after || 0) && item.at >= cutoff);
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
