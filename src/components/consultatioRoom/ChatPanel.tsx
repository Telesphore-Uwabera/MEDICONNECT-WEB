// components/consultatioRoom/ChatPanel.tsx
import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { X, Send, MessageSquare, Loader2 } from "lucide-react";
import {
  useConsultationChat,
  type ChatMessage,
} from "@/hooks/video/use-consultation-chat";

const fmt = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Bubble = ({
  msg,
  doctorAvatar,
}: {
  msg: ChatMessage;
  doctorAvatar: string;
}) => {
  const isMe = msg.from === "me";
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isMe && (
        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5">
          {doctorAvatar}
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] space-y-0.5",
          isMe ? "items-end" : "items-start",
          "flex flex-col",
        )}
      >
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-[12px] leading-relaxed break-words",
            isMe
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-white/10 text-white/90 rounded-bl-sm",
          )}
        >
          {msg.text}
        </div>
        <span className="text-[9px] text-white/30 px-1">
          {fmt(msg.timestamp)}
        </span>
      </div>
    </div>
  );
};

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  doctorAvatar: string;
  consultationId: number | null;
  isOwner: boolean;
  /** Expose unread count + clearUnread to parent (for badge on chat button) */
  onUnreadChange?: (count: number) => void;
}

export const ChatPanel = ({
  open,
  onClose,
  doctorAvatar,
  consultationId,
  isOwner,
  onUnreadChange,
}: ChatPanelProps) => {
  const { t, i18n } = useTranslation();
  const chat = useConsultationChat(consultationId, isOwner);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Notify parent about unread changes
  useEffect(() => {
    onUnreadChange?.(chat.unreadCount);
  }, [chat.unreadCount, onUnreadChange]);

  // Mark as read + focus input when panel opens
  useEffect(() => {
    if (open) {
      chat.markAsRead();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as read whenever new messages arrive while panel is open
  useEffect(() => {
    if (open && chat.unreadCount > 0) chat.markAsRead();
  }, [chat.messages.length, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to latest message
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
    return () => clearTimeout(timer);
  }, [chat.messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    chat.sendMessage(text);
    setDraft("");
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full w-full flex flex-col z-20",
        "bg-[#1a1a1a]/95 backdrop-blur-sm border-l border-white/10",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-white/50" />
          <span className="text-[12px] font-semibold text-white/80">
            {t("consult.chat.title")}
          </span>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {chat.loading && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
            <p className="text-[11px] text-white/30">{t("consult.chat.loading")}</p>
          </div>
        )}
        {!chat.loading && chat.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white/20" />
            </div>
            <p className="text-[11px] text-white/30 leading-relaxed">
              {t("consult.chat.empty")}
            </p>
          </div>
        )}
        {chat.messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} doctorAvatar={doctorAvatar} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-white/10">
        <div className="flex items-end gap-2 rounded-xl bg-white/8 border border-white/10 px-3 py-2 focus-within:border-white/25 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // Auto-grow up to 4 rows
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 88)}px`;
            }}
            onKeyDown={handleKey}
            placeholder={t("consult.chat.placeholder")}
            className={cn(
              "flex-1 bg-transparent resize-none outline-none",
              "text-[12px] text-white/80 placeholder:text-white/25",
              "leading-relaxed min-h-[20px]",
            )}
            style={{ height: "20px" }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || chat.sending}
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
              draft.trim() && !chat.sending
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                : "text-white/20 cursor-not-allowed",
            )}
          >
            {chat.sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <p className="text-[9px] text-white/20 mt-1.5 text-center">
          {t("consult.chat.enter_hint")}
        </p>
      </div>
    </div>
  );
};
