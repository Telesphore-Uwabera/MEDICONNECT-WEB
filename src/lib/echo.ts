import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'wss',
    enabledTransports: ['ws', 'wss'],
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

export default echo;