import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

window.Pusher = Pusher;

function socketHost() {
  const host = String(import.meta.env.VITE_REVERB_HOST || "").trim();
  if (!host || host.includes("trycloudflare")) {
    return "ws.mediconnect.rw";
  }
  return host;
}

type ListenFn = (data: any) => void;

function wrapChannel(channel: ReturnType<Pusher["subscribe"]>) {
  return {
    listen(event: string, callback: ListenFn) {
      const name = event.startsWith(".") ? event.slice(1) : event;
      channel.bind(name, callback);
      if (name !== event) channel.bind(event, callback);
      return this;
    },
    stopListening(event: string, callback?: ListenFn) {
      const name = event.startsWith(".") ? event.slice(1) : event;
      if (callback) {
        channel.unbind(name, callback);
        if (name !== event) channel.unbind(event, callback);
      } else {
        channel.unbind(name);
        if (name !== event) channel.unbind(event);
      }
      return this;
    },
  };
}

const authHeaders: Record<string, string> = {};

const pusher = new Pusher(import.meta.env.VITE_REVERB_APP_KEY || "mediconnect-staging-key", {
  wsHost: socketHost(),
  wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
  wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME || "wss") !== "ws",
  enabledTransports: ["ws", "wss"],
  disableStats: true,
  cluster: "mt1",
  authEndpoint: `${import.meta.env.VITE_APP_BASE_URL}/broadcasting/auth`,
  authorizer: (channel) => ({
    authorize: (socketId, callback) => {
      let token = localStorage.getItem("auth_token");
      if (!token) {
        try {
          const sessionStr = localStorage.getItem("instant_consult_session");
          if (sessionStr) token = JSON.parse(sessionStr).token;
        } catch {
          /* ignore */
        }
      }
      fetch(`${import.meta.env.VITE_APP_BASE_URL}/broadcasting/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...authHeaders,
        },
        body: JSON.stringify({
          socket_id: socketId,
          channel_name: channel.name,
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Auth failed");
          return response.json();
        })
        .then((data) => callback(false, data))
        .catch((error) => callback(true, error));
    },
  }),
});

const echo = {
  connector: {
    pusher,
    options: { auth: { headers: authHeaders } },
  },
  channel(name: string) {
    return wrapChannel(pusher.subscribe(name));
  },
  private(name: string) {
    return wrapChannel(pusher.subscribe(`private-${name}`));
  },
  leave(name: string) {
    pusher.unsubscribe(name);
    pusher.unsubscribe(`private-${name}`);
  },
  leaveChannel(name: string) {
    pusher.unsubscribe(name);
    pusher.unsubscribe(`private-${name}`);
  },
  disconnect() {
    pusher.disconnect();
  },
};

const connection = pusher.connection;
if (connection) {
  let stopped = false;
  const stopRetrying = () => {
    if (stopped) return;
    stopped = true;
    try {
      echo.disconnect();
    } catch {
      /* ignore */
    }
  };
  connection.bind("failed", stopRetrying);
  connection.bind("unavailable", stopRetrying);
}

export default echo;
