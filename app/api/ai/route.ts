import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type HospitalContext = {
  sido?: string;
  totalCount?: number;
  hospitals?: Array<{
    yadmNm?: string;
    clCdNm?: string;
    sgguCdNm?: string;
    addr?: string;
    drTotCnt?: string | number;
  }>;
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is missing. 더미 AI 답변은 제거했습니다." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { question?: string; context?: HospitalContext };
  const question = body.question?.trim() || "이 지역의 의료 이용 방법을 알려주세요.";
  const context = formatContext(body.context);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 700,
    system:
      "너는 한국 지역 의료 접근성 안내 도우미다. 응급 상황은 119와 응급실을 우선 안내하고, 진단을 단정하지 않는다. 제공된 HIRA 병원 데이터 안에서 현실적인 다음 행동을 한국어로 짧게 제시한다.",
    messages: [
      {
        role: "user",
        content: `HIRA 병원 데이터:\n${context}\n\n질문: ${question}`
      }
    ]
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return NextResponse.json({ answer: text });
}

function formatContext(context: HospitalContext | undefined) {
  if (!context) {
    return "제공된 병원 데이터 없음";
  }

  const hospitals = context.hospitals?.map((hospital, index) => (
    `${index + 1}. ${hospital.yadmNm ?? "이름 없음"} / ${hospital.clCdNm ?? "종별 없음"} / ${hospital.sgguCdNm ?? "지역 없음"} / 의사 ${hospital.drTotCnt ?? "미상"}명 / ${hospital.addr ?? "주소 없음"}`
  )) ?? [];

  return [
    `시도: ${context.sido ?? "미상"}`,
    `총 의료기관 수: ${context.totalCount ?? "미상"}`,
    "현재 조회 병원:",
    hospitals.length ? hospitals.join("\n") : "없음"
  ].join("\n");
}
