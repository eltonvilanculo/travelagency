"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTrip } from "@/lib/trip-context";
import type { Locale } from "@/i18n/config";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

const WHATSAPP_URL = "https://wa.me/258845669066";
const PHONE_URL = "tel:+258845669066";

// Matches the seeded FaqEntry.questionPt/questionEn text (see prisma/seed.ts)
// almost verbatim, so these always land as a confident match rather than
// relying on the fuzzy matcher for the very first thing a visitor sees.
const SUGGESTED_QUESTIONS = {
  pt: [
    "Como cancelo a minha reserva?",
    "Que métodos de pagamento aceitam?",
    "Porque preciso de criar conta?",
    "Como reservo um pacote para mais pessoas?",
  ],
  en: [
    "How do I cancel my booking?",
    "What payment methods do you accept?",
    "Why do I need an account?",
    "How do I book a package for more people?",
  ],
} as const;

const COPY = {
  pt: {
    trigger: "Ajuda",
    title: "Perguntas Frequentes",
    subtitle: "Prefere falar com alguém?",
    call: "Ligar",
    whatsapp: "WhatsApp",
    placeholder: "Escreva a sua pergunta...",
    send: "Enviar",
    greeting: "Olá! Pergunte-me sobre reservas, pagamentos, cancelamentos ou a sua conta.",
    suggestedLabel: "Perguntas comuns",
    errorGeneric: "Algo correu mal, tente novamente.",
    close: "Fechar",
    handoffConnected: "Não tenho a certeza sobre isso — estou a ligar-o(a) a um agente humano, alguém vai continuar esta conversa em breve.",
    handoffNotConnected: "Não tenho a certeza sobre isso. A sua pergunta foi registada e a nossa equipa vai analisá-la — ou fale connosco já pelo botão de chamada ou WhatsApp acima.",
  },
  en: {
    trigger: "Help",
    title: "Frequently Asked Questions",
    subtitle: "Prefer to talk to someone?",
    call: "Call",
    whatsapp: "WhatsApp",
    placeholder: "Type your question...",
    send: "Send",
    greeting: "Hi! Ask me about bookings, payments, cancellations or your account.",
    suggestedLabel: "Common questions",
    errorGeneric: "Something went wrong, please try again.",
    close: "Close",
    handoffConnected: "I'm not sure about that — connecting you to a human agent, someone will pick up this conversation shortly.",
    handoffNotConnected: "I'm not sure about that. Your question has been logged and our team will follow up — or reach us right now with the call or WhatsApp button above.",
  },
} as const;

export function FaqChat({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const { data: session } = useSession();
  const { chatOpen: open, openChat, closeChat } = useTrip();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, sending]);

  const sendMessage = async (text: string) => {
    if (!text || sending) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          locale,
          contact: session?.user
            ? { name: session.user.name ?? undefined, email: session.user.email ?? undefined }
            : undefined,
        }),
      });

      if (!response.ok) throw new Error("request_failed");
      const data = await response.json();

      const replyText =
        data.type === "answer" ? data.answer : data.connected ? t.handoffConnected : t.handoffNotConnected;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: replyText }]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: t.errorGeneric }]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input.trim());
  };

  const userInitial = session?.user?.name?.trim()?.[0]?.toUpperCase() ?? null;

  return (
    <>
      {/* Stacked above TripDrawer's "Minha Viagem" trigger (bottom-4/6
       * right-4/6) rather than sharing its spot — both stay reachable at
       * once, and neither trigger button covers the other. */}
      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label={t.trigger}
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 bg-white text-leafy border border-leafy/30 rounded-full w-12 h-12 flex items-center justify-center shadow-xl hover:bg-leafy/5 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer animate-pop"
        >
          <ChatIcon />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm h-[30rem] max-h-[65vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-chat-pop-in">
          <div className="bg-leafy px-5 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-white text-base font-semibold">{t.title}</h2>
            <button type="button" onClick={closeChat} aria-label={t.close} className="text-white/70 hover:text-white cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Always-visible human handoff shortcuts — a real person is one tap
           * away, not buried behind a low-confidence bot reply. */}
          <div className="px-4 py-2.5 bg-orange/10 border-b border-orange/20 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-600">{t.subtitle}</span>
            <div className="flex gap-2">
              <a
                href={PHONE_URL}
                className="inline-flex items-center gap-1.5 bg-orange text-white text-xs font-semibold rounded-full px-3 py-1.5 hover:bg-orange/90 transition-colors"
              >
                <PhoneIcon />
                {t.call}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold rounded-full px-3 py-1.5 hover:bg-[#25D366]/90 transition-colors"
              >
                <WhatsappIcon />
                {t.whatsapp}
              </a>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            <MessageRow role="bot" text={t.greeting} userInitial={userInitial} />

            {messages.length === 0 && (
              <div className="animate-drop-in pl-9">
                <p className="text-xs font-medium text-slate-400 mb-1.5">{t.suggestedLabel}</p>
                <div className="flex flex-col items-start gap-1.5">
                  {SUGGESTED_QUESTIONS[locale].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs font-medium text-leafy bg-leafy/5 hover:bg-leafy/10 border border-leafy/20 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageRow key={m.id} role={m.role} text={m.text} userInitial={userInitial} />
            ))}

            {sending && <TypingRow />}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 flex gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leafy/30"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label={t.send}
              className="bg-leafy text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function MessageRow({ role, text, userInitial }: { role: "user" | "bot"; text: string; userInitial: string | null }) {
  const isUser = role === "user";
  return (
    <div className={`animate-drop-in flex items-end gap-2 max-w-[90%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
      {isUser ? <UserAvatar initial={userInitial} /> : <BotAvatar />}
      <div
        className={`text-sm rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
          isUser ? "bg-leafy text-white rounded-br-sm" : "bg-slate-100 text-slate-700 rounded-bl-sm"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function TypingRow() {
  return (
    <div className="animate-drop-in flex items-end gap-2 max-w-[90%]">
      <BotAvatar />
      <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-leafy text-white flex items-center justify-center shrink-0" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        />
      </svg>
    </div>
  );
}

function UserAvatar({ initial }: { initial: string | null }) {
  return (
    <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs font-semibold" aria-hidden>
      {initial ?? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      )}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.6c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.1c-1.6 0-3.1-.4-4.5-1.2l-.3-.2-3 .8.8-2.9-.2-.3a8.1 8.1 0 1 1 7.2 3.8zm4.4-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.1 1.5-.1.5-.2 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}
