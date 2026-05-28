import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = process.env.DATA_GO_KR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "DATA_GO_KR_API_KEY is missing. Add a valid data.go.kr key to .env.local." },
      { status: 500 }
    );
  }

  const url = new URL("https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList");
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("pageNo", searchParams.get("pageNo") ?? "1");
  url.searchParams.set("numOfRows", searchParams.get("numOfRows") ?? "30");

  copyParam(searchParams, url.searchParams, "sidoCd");
  copyParam(searchParams, url.searchParams, "sgguCd");
  copyParam(searchParams, url.searchParams, "emdongNm");
  copyParam(searchParams, url.searchParams, "yadmNm");
  copyParam(searchParams, url.searchParams, "zipCd");
  copyParam(searchParams, url.searchParams, "clCd");
  copyParam(searchParams, url.searchParams, "dgsbjtCd");
  copyParam(searchParams, url.searchParams, "xPos");
  copyParam(searchParams, url.searchParams, "yPos");
  copyParam(searchParams, url.searchParams, "radius");
  copyParam(searchParams, url.searchParams, "_type");

  let response: Response;
  let text: string;
  try {
    response = await fetch(url, { next: { revalidate: 3600 } });
    text = await response.text();
  } catch (err) {
    return NextResponse.json(
      { error: `HIRA API 연결 실패: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "HIRA 병원정보서비스 오류",
        upstreamStatus: response.status,
        upstreamMessage: text.slice(0, 300)
      },
      { status: response.status }
    );
  }

  return new NextResponse(text, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/xml; charset=utf-8" }
  });
}

function copyParam(from: URLSearchParams, to: URLSearchParams, key: string) {
  const value = from.get(key);
  if (value) {
    to.set(key, value);
  }
}
