import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/app/types";

type HospitalCtx = {
  sido?: string;
  totalCount?: number;
  hospitals?: Array<{
    yadmNm?: string;
    clCdNm?: string;
    addr?: string;
    drTotCnt?: string | number;
  }>;
  interests?: string[];
};

type RequestBody = {
  messages?: ChatMessage[];
  context?: HospitalCtx;
};

const SYSTEM =
  "너는 한국 지역 의료 접근성 안내 도우미다. 응급 상황은 119와 응급실을 우선 안내하고, 진단을 단정하지 않는다. 제공된 HIRA 병원 데이터 안에서 현실적인 다음 행동을 한국어로 짧고 자연스럽게 제시한다. 마크다운 문법은 사용하지 않는다.";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as RequestBody;
  const messages = body.messages ?? [];
  if (!messages.length) {
    return NextResponse.json({ error: "messages가 비어 있습니다." }, { status: 400 });
  }

  const contextBlock = formatContext(body.context);
  const messagesWithCtx = messages.map((m, i) =>
    i === 0
      ? { ...m, content: `[현재 지역 HIRA 병원 데이터]\n${contextBlock}\n\n${m.content}` }
      : m
  );

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 700,
    system: SYSTEM,
    messages: messagesWithCtx,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function formatContext(ctx: HospitalCtx | undefined): string {
  if (!ctx) return "제공된 병원 데이터 없음";
  const list =
    ctx.hospitals?.map(
      (h, i) =>
        `${i + 1}. ${h.yadmNm ?? "이름없음"} / ${h.clCdNm ?? "종별불명"} / 의사 ${h.drTotCnt ?? "?"}명 / ${h.addr ?? "주소없음"}`
    ) ?? [];
  return [
    `지역: ${ctx.sido ?? "미상"}`,
    `총 의료기관: ${ctx.totalCount ?? "미상"}개`,
    ctx.interests?.length ? `관심사: ${ctx.interests.join(", ")}` : null,
    "병원 목록:",
    list.length ? list.join("\n") : "없음",
  ]
    .filter(Boolean)
    .join("\n");
}
