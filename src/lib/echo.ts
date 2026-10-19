import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

function reverbHost() {
    const host = String(import.meta.env.VITE_REVERB_HOST || "").trim();
    if (!host || host.includes("trycloudflare")) {
        return "ws.mediconnect.rw";
    }
    return host;
}

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || "mediconnect-staging-key",
    wsHost: reverbHost(),
    wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
    wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || "wss") !== "ws",
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: `${import.meta.env.VITE_APP_BASE_URL}/broadcasting/auth`,
    authorizer: (channel: any, options: any) => {
        return {
            authorize: (socketId: string, callback: Function) => {
                let token = localStorage.getItem("auth_token");
                if (!token) {
                    try {
                        const sessionStr = localStorage.getItem("instant_consult_session");
                        if (sessionStr) {
                            token = JSON.parse(sessionStr).token;
                        }
                    } catch { }
                }

                fetch(options.authEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name
                    })
                })
                    .then(response => {
                        if (!response.ok) throw new Error('Auth failed');
                        return response.json();
                    })
                    .then(data => callback(false, data))
                    .catch(error => callback(true, error));
            }
        };
    },
});

const connection = echo?.connector?.pusher?.connection;
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
