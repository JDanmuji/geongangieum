import { NextResponse } from "next/server";

const endpointByType = {
  detail: "getDtlInfo2.7",
  departments: "getDgsbjtInfo2.7",
  specialists: "getSpcSbjtSdrInfo2.7",
  staff: "getEtcHstInfo2.7",
  equipment: "getMedOftInfo2.7",
  transport: "getTrnsprtInfo2.7",
  specialCare: "getSpclDiagInfo2.7"
} as const;

type DetailType = keyof typeof endpointByType;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  const ykiho = searchParams.get("ykiho");
  const type = normalizeType(searchParams.get("type"));

  if (!apiKey) {
    return NextResponse.json(
      { error: "DATA_GO_KR_API_KEY is missing. Add it to .env.local." },
      { status: 500 }
    );
  }

  if (!ykiho) {
    return NextResponse.json(
      {
        error: "Missing ykiho.",
        usage: "/api/hospital-detail?type=detail&ykiho=병원정보서비스에서_받은_ykiho",
        types: Object.keys(endpointByType)
      },
      { status: 400 }
    );
  }

  const url = new URL(`https://apis.data.go.kr/B551182/MadmDtlInfoService2.7/${endpointByType[type]}`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("ykiho", ykiho);
  url.searchParams.set("pageNo", searchParams.get("pageNo") ?? "1");
  url.searchParams.set("numOfRows", searchParams.get("numOfRows") ?? "20");
  url.searchParams.set("_type", searchParams.get("_type") ?? "json");

  let response: Response;
  let text: string;
  try {
    response = await fetch(url, { next: { revalidate: 3600 } });
    text = await response.text();
  } catch (err) {
    return NextResponse.json(
      { error: `HIRA 상세 API 연결 실패: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
    }
  });
}

function normalizeType(type: string | null): DetailType {
  if (type && type in endpointByType) {
    return type as DetailType;
  }

  return "detail";
}
