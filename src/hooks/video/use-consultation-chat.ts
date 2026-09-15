import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import echo from "@/lib/echo";
import { useMe } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessageApi {
  id: number;
  instant_consultation_request_id: number;
  sender_id: number;
  sender_type: "doctor" | "patient";
  message: string;
  read_at: string | null;
  created_at: string;
}

interface GetMessagesResponse {
  messages: {
    data: ChatMessageApi[];
    next_cursor: string | null;
    next_page_url: string | null;
  };
}

interface SendMessageResponse {
  message: string;
  data: ChatMessageApi;
}

// Normalised message for the UI
export interface ChatMessage {
  id: string;
  from: "me" | "other";
  text: string;
  timestamp: number;
  senderType: "doctor" | "patient";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type ChatMode = "instant" | "appointment";

export function useConsultationChat(
  consultationId: number | null,
  isOwner?: boolean,
  mode: ChatMode = "instant",
) {
  // Instant consults and scheduled appointments use different chat endpoints
  // and broadcast channels, but the same UI.
  const chatBase =
    mode === "appointment" ? `/chat/${consultationId}` : `/chat/instant/${consultationId}`;
  const chatChannel =
    mode === "appointment"
      ? `appointment.${consultationId}.chat`
      : `instant-consultation.${consultationId}.chat`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { data: me } = useMe();
  const currentUserIdRef = useRef<number | null>(me?.id ?? null);

  // Update ref when me?.id becomes available (to avoid invalidating toUiMessage)
  useEffect(() => {
    currentUserIdRef.current = me?.id ?? null;
  }, [me?.id]);

  // Convert API message to UI message
  const toUiMessage = useCallback(
    (msg: ChatMessageApi): ChatMessage => {
      let isMe = false;
      if (isOwner !== undefined) {
        const myRole = isOwner ? "doctor" : "patient";
        isMe = msg.sender_type === myRole;
      } else {
        isMe =
          currentUserIdRef.current !== null &&
          msg.sender_id === currentUserIdRef.current;
      }

      return {
        id: String(msg.id),
        from: isMe ? "me" : "other",
        text: msg.message,
        timestamp: new Date(msg.created_at).getTime(),
        senderType: msg.sender_type,
      };
    },
    [isOwner],
  );

  // ── Fetch existing messages ─────────────────────────────────────────────────
  useEffect(() => {
    if (!consultationId) return;

    let cancelled = false;
    setLoading(true);

    apiFetch<GetMessagesResponse>(chatBase)
      .then((res) => {
        if (cancelled) return;
        const mapped = (res.messages?.data ?? []).map(toUiMessage);
        // API returns newest first → reverse for chronological order
        setMessages(mapped);
      })
      .catch((err) => {
        console.error("[Chat] Failed to fetch messages:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [consultationId, toUiMessage, chatBase]);

  // ── Subscribe to real-time messages ─────────────────────────────────────────
  useEffect(() => {
    if (!consultationId) return;

    const channelName = chatChannel;
    console.info(`[Chat] Subscribing to channel: ${channelName}`);

    // Ensure Echo uses the freshest token (especially for guests who just auto-logged in)
    if (echo.connector?.options?.auth?.headers) {
      echo.connector.options.auth.headers.Authorization = `Bearer ${localStorage.getItem("auth_token")}`;
    }

    const channel = echo.channel(channelName);
    const handleMessage = (data: { data?: ChatMessageApi } & ChatMessageApi) => {
      // The event payload may be the message directly or nested in .data
      const msg: ChatMessageApi = data.data ?? data; 

      const uiMsg = toUiMessage(msg);

      setMessages((prev) => {
        // Deduplicate — the message might already exist from optimistic send
        if (prev.some((m) => m.id === uiMsg.id)) return prev;
        return [...prev, uiMsg];
      });

      if (uiMsg.from === "other") {
        setUnreadCount((c) => c + 1);
      }
    };

    channel.listen(".message.sent", handleMessage);
    channel.listen("MessageSent", handleMessage);
    channel.listen(".MessageSent", handleMessage);

    return () => {
      console.info(`[Chat] Leaving channel: ${channelName}`);
      channel.stopListening(".message.sent");
      channel.stopListening("MessageSent");
      channel.stopListening(".MessageSent");
      echo.leave(channelName);
    };
  }, [consultationId, toUiMessage, chatChannel]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (!consultationId) {
        toast.error("Consultation ID is missing. Cannot send message.");
        console.error("[Chat] Cannot send message: consultationId is null");
        return;
      }

      setSending(true);

      // Optimistic: add immediately
      const optimisticId = `opt-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        from: "me",
        text: text.trim(),
        timestamp: Date.now(),
        senderType: isOwner !== undefined ? (isOwner ? "doctor" : "patient") : "patient",
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const res = await apiFetch<SendMessageResponse>(
          chatBase,
          {
            method: "POST",
            headers: {
              "X-Socket-ID": echo.socketId() || "",
            },
            body: {
              message: text.trim(),
            },
          },
        );

        // Replace optimistic message with real one
        const msgData = res.data ?? res;
        const realMsg = toUiMessage(msgData as ChatMessageApi);
        setMessages((prev) => {
          // If the real message already arrived via websocket, just remove the optimistic one
          if (prev.some((m) => m.id === realMsg.id)) {
            return prev.filter((m) => m.id !== optimisticId);
          }
          return prev.map((m) => (m.id === optimisticId ? realMsg : m));
        });
      } catch (err: any) {
        console.error("[Chat] Failed to send message:", err);
        toast.error(err.message || "Failed to send message");
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } finally {
        setSending(false);
      }
    },
    [consultationId, toUiMessage, isOwner, chatBase],
  );

  // ── Mark as read ────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    if (!consultationId) return;
    setUnreadCount(0);
    try {
      await apiFetch(`${chatBase}/read`, {
        method: "POST",
      });
    } catch (err) {
      console.error("[Chat] Failed to mark as read:", err);
    }
  }, [consultationId, chatBase]);

  // ── Clear unread (local only, e.g. when panel opens) ────────────────────────
  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    messages,
    unreadCount,
    loading,
    sending,
    sendMessage,
    markAsRead,
    clearUnread,
  };
}
