"use client";

import { useState } from "react";
import { ChevronRight, HeartPulse, LocateFixed } from "lucide-react";
import { sgguMap } from "@/lib/sggu";

const sidoOptions = [
  { name: "서울", code: "110000" }, { name: "부산", code: "210000" }, { name: "대구", code: "220000" },
  { name: "인천", code: "230000" }, { name: "광주", code: "240000" }, { name: "대전", code: "250000" },
  { name: "울산", code: "260000" }, { name: "경기", code: "310000" }, { name: "강원", code: "320000" },
  { name: "충북", code: "330000" }, { name: "충남", code: "340000" }, { name: "전북", code: "350000" },
  { name: "전남", code: "360000" }, { name: "경북", code: "370000" }, { name: "경남", code: "380000" },
  { name: "제주", code: "390000" }, { name: "세종", code: "410000" },
];

const HEALTH_INTERESTS = [
  { label: "내과·가정의학", emoji: "💊" },
  { label: "소아청소년과", emoji: "👶" },
  { label: "정형외과·재활", emoji: "🦴" },
  { label: "치과·구강", emoji: "🦷" },
  { label: "한방·한의원", emoji: "🌿" },
  { label: "피부과·성형", emoji: "✨" },
  { label: "안과·이비인후과", emoji: "👁️" },
  { label: "산부인과", emoji: "🌸" },
];

export type OnboardResult = {
  sidoCd: string;
  sgguCd: string;
  useGps: boolean;
  interests: string[];
};

export default function OnboardingModal({ onDone }: { onDone: (r: OnboardResult) => void }) {
  const [sidoCd, setSidoCd] = useState("110000");
  const [sgguCd, setSgguCd] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const sgguOptions = sgguMap[sidoCd] ?? [];

  function toggleInterest(label: string) {
    setInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  }

  function handleGps() {
    if (!navigator?.geolocation) {
      setGpsError("이 브라우저는 위치 정보를 지원하지 않아요.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      () => onDone({ sidoCd, sgguCd, useGps: true, interests }),
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === 1 ? "위치 권한이 거부됐어요. 아래에서 지역을 선택해주세요." : "위치를 가져오지 못했어요. 직접 선택해주세요.");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <div className="onboard-backdrop">
      <div className="onboard-card">
        {/* 헤더 */}
        <div className="onboard-header">
          <div className="onboard-logo">
            <HeartPulse size={22} />
          </div>
          <h1 className="onboard-title">건강이음</h1>
          <p className="onboard-sub">내 주변 병원·의원 정보를 한눈에 볼 수 있어요</p>
        </div>

        {/* GPS */}
        <div className="onboard-section">
          <p className="onboard-section-label">위치를 알려주시면 바로 주변 병원을 찾아드려요</p>
          <button
            className={`onboard-gps-btn ${gpsLoading ? "loading" : ""}`}
            onClick={handleGps}
            disabled={gpsLoading}
          >
            <LocateFixed size={17} />
            {gpsLoading ? "위치 확인 중..." : "현재 위치 사용하기"}
          </button>
          {gpsError && <p className="onboard-error">{gpsError}</p>}
        </div>

        {/* 구분선 */}
        <div className="onboard-or"><span>또는 지역 선택</span></div>

        {/* 지역 선택 */}
        <div className="onboard-region">
          <select
            value={sidoCd}
            onChange={e => { setSidoCd(e.target.value); setSgguCd(""); }}
          >
            {sidoOptions.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
          <select value={sgguCd} onChange={e => setSgguCd(e.target.value)}>
            <option value="">시·군·구 전체</option>
            {sgguOptions.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
        </div>

        {/* 관심 분야 */}
        <div className="onboard-section">
          <p className="onboard-section-label">
            관심 있는 진료 분야를 선택해주세요
            <span className="onboard-optional">선택</span>
          </p>
          <div className="onboard-interests">
            {HEALTH_INTERESTS.map(({ label, emoji }) => (
              <button
                key={label}
                className={`onboard-interest-chip ${interests.includes(label) ? "selected" : ""}`}
                onClick={() => toggleInterest(label)}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* 시작 */}
        <button
          className="onboard-start-btn"
          onClick={() => onDone({ sidoCd, sgguCd, useGps: false, interests })}
        >
          시작하기
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
