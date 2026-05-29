"use client";

import { LocateFixed, Search } from "lucide-react";
import { sgguMap } from "@/lib/sggu";

export const sidoOptions = [
  { name: "서울", code: "110000" }, { name: "부산", code: "210000" },
  { name: "대구", code: "220000" }, { name: "인천", code: "230000" },
  { name: "광주", code: "240000" }, { name: "대전", code: "250000" },
  { name: "울산", code: "260000" }, { name: "경기", code: "310000" },
  { name: "강원", code: "320000" }, { name: "충북", code: "330000" },
  { name: "충남", code: "340000" }, { name: "전북", code: "350000" },
  { name: "전남", code: "360000" }, { name: "경북", code: "370000" },
  { name: "경남", code: "380000" }, { name: "제주", code: "390000" },
  { name: "세종", code: "410000" },
];

type Props = {
  sidoCd: string;
  sgguCd: string;
  keyword: string;
  radius: string;
  location: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  apiMsg: string;
  onSidoChange: (code: string) => void;
  onSgguChange: (code: string) => void;
  onKeywordChange: (v: string) => void;
  onRadiusChange: (v: string) => void;
  onGpsToggle: () => void;
};

export default function SearchBar({
  sidoCd, sgguCd, keyword, radius, location,
  isLoading, apiMsg,
  onSidoChange, onSgguChange, onKeywordChange, onRadiusChange, onGpsToggle,
}: Props) {
  const sgguOptions = sgguMap[sidoCd] ?? [];
  const statusClass = isLoading
    ? "loading"
    : apiMsg.includes("오류") || apiMsg.includes("실패")
      ? "error"
      : "ok";
  const statusText = isLoading ? "조회 중..." : apiMsg || "대기 중";

  return (
    <section className="search-bar">
      <div className="inner">
        <div className="sb-controls">
          <div className="search-group">
            <select
              value={sidoCd}
              onChange={e => onSidoChange(e.target.value)}
              disabled={!!location}
              style={{ minWidth: 72 }}
            >
              {sidoOptions.map(o => (
                <option key={o.code} value={o.code}>{o.name}</option>
              ))}
            </select>
            <select
              value={sgguCd}
              onChange={e => onSgguChange(e.target.value)}
              disabled={!!location}
              style={{ minWidth: 96 }}
            >
              <option value="">전체</option>
              {sgguOptions.map(o => (
                <option key={o.code} value={o.code}>{o.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`gps-btn sb-gps${location ? " active" : ""}`}
            onClick={onGpsToggle}
          >
            <LocateFixed size={15} />
            {location ? "위치 해제" : "현재 위치"}
          </button>

          <div className="search-input-wrap sb-search">
            <Search size={14} />
            <input
              type="text"
              value={keyword}
              onChange={e => onKeywordChange(e.target.value)}
              placeholder="병원 이름으로 검색"
            />
          </div>

          {location && (
            <select
              value={radius}
              onChange={e => onRadiusChange(e.target.value)}
              style={{ width: 72 }}
            >
              <option value="1000">1km</option>
              <option value="3000">3km</option>
              <option value="5000">5km</option>
              <option value="10000">10km</option>
            </select>
          )}

          <div className={`status-chip ${statusClass}`} style={{ flexShrink: 0 }}>
            <span className="status-dot" />
            {statusText}
          </div>
        </div>
      </div>
    </section>
  );
}
