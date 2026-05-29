"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, RefreshCw, Send, X } from "lucide-react";
import type { ChatMessage, Hospital } from "@/app/types";

type Props = {
  context: {
    sido: string;
    totalCount: number;
    hospitals: Hospital[];
    interests: string[];
  };
};

const QUICK_QUESTIONS = [
  "이 지역 소아과는 어디 있나요?",
  "응급실 위치를 알려줘",
  "고혈압 진료 잘 보는 병원은?",
  "야간 진료하는 병원 있나요?",
];

export default function AiPanel({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            sido: context.sido,
            totalCount: context.totalCount,
            hospitals: context.hospitals.slice(0, 10),
            interests: context.interests,
          },
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `API 오류 ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: accumulated };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `오류가 발생했습니다: ${(e as Error).message}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setStreaming(false);
  }

  return (
    <>
      <button
        className={`ai-fab${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-label="AI 의료 상담"
      >
        {open ? <X size={20} /> : <Bot size={20} />}
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Bot size={15} color="var(--green)" />
              AI 의료 상담
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {messages.length > 0 && (
                <button className="ai-panel-close" onClick={reset} title="새 대화">
                  <RefreshCw size={14} />
                </button>
              )}
              <button className="ai-panel-close" onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="ai-chat-body">
            {messages.length === 0 ? (
              <div className="ai-quick-wrap">
                <p className="ai-quick-label">빠른 질문</p>
                <div className="ai-quick-btns">
                  {QUICK_QUESTIONS.map(q => (
                    <button key={q} className="ai-quick-btn" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="ai-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                    {m.role === "assistant" && (
                      <div className="ai-msg-avatar">
                        <Bot size={12} />
                      </div>
                    )}
                    <div className="ai-bubble">
                      {m.content ? (
                        m.content
                      ) : streaming && i === messages.length - 1 ? (
                        <span className="ai-cursor" />
                      ) : null}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="ai-panel-footer">
            <textarea
              className="ai-panel-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="궁금한 점을 입력하세요 (Enter로 전송)"
              rows={2}
              disabled={streaming}
            />
            <button
              className="ai-panel-send"
              onClick={() => send()}
              disabled={streaming || !input.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
