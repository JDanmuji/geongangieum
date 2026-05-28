import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "No real medical-staff API is connected.",
      message: "더미 의료인력 데이터는 제거했습니다. 의료인력은 /api/hospital 응답의 drTotCnt 또는 /api/hospital-detail?type=specialists&ykiho=... 를 사용하세요."
    },
    { status: 501 }
  );
}
