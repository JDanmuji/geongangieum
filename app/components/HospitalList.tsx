"use client";

import { Building2, Stethoscope } from "lucide-react";
import type { Hospital } from "@/app/types";

const TYPE_FILTERS = ["전체", "상급종합", "종합병원", "병원", "의원", "한의원", "치과"] as const;

function getTypeDot(clCdNm = "") {
  if (clCdNm.includes("상급종합")) return "상급종합";
  if (clCdNm.includes("종합병원")) return "종합병원";
  if (clCdNm.includes("병원"))    return "병원";
  if (clCdNm.includes("의원"))    return "의원";
  if (clCdNm.includes("한의"))    return "한의원";
  if (clCdNm.includes("치과"))    return "치과";
  return "other";
}

type Props = {
  hospitals: Hospital[];
  filteredHospitals: Hospital[];
  totalCount: number;
  isLoading: boolean;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onSelect: (h: Hospital) => void;
};

export default function HospitalList({
  hospitals, filteredHospitals, totalCount, isLoading, typeFilter, setTypeFilter, onSelect,
}: Props) {
  const typeCounts: Record<string, number> = {};
  hospitals.forEach(h => {
    const t = h.clCdNm ?? "";
    const key = (["상급종합", "종합병원", "병원", "의원", "한의", "치과"] as const)
      .find(k => t.includes(k)) ?? "기타";
    const label = key === "한의" ? "한의원" : key;
    typeCounts[label] = (typeCounts[label] ?? 0) + 1;
  });

  return (
    <div className="list-pane">
      <div className="list-pane-header">
        <div className="filter-chips list-chips">
          {TYPE_FILTERS.map(t => {
            const count = t === "전체" ? hospitals.length : (typeCounts[t] ?? 0);
            return (
              <button
                key={t}
                type="button"
                className={`chip${typeFilter === (t === "전체" ? "" : t) ? " active" : ""}`}
                onClick={() => setTypeFilter(t === "전체" ? "" : t)}
              >
                {t}
                {count > 0 && <span className="chip-count">{count}</span>}
              </button>
            );
          })}
        </div>
        <span className="list-count">
          {isLoading
            ? "조회 중..."
            : `${filteredHospitals.length}개 / 전체 ${totalCount.toLocaleString()}개`}
        </span>
      </div>

      <div className="list-pane-body">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="hcard" style={{ cursor: "default" }}>
              <div className="hcard-type">
                <span className="skeleton" style={{ display: "block", width: 44, height: 20, borderRadius: 99 }} />
              </div>
              <div className="hcard-body">
                <p className="skeleton" style={{ height: 16, width: "60%", marginBottom: 6 }} />
                <p className="skeleton" style={{ height: 12, width: "80%" }} />
              </div>
              <div />
            </div>
          ))
        ) : filteredHospitals.length === 0 ? (
          <div className="hospital-empty">
            <Building2 size={28} color="var(--line)" />
            <p>조회된 병원이 없습니다</p>
            {typeFilter && <p>다른 유형 필터를 선택해 보세요</p>}
          </div>
        ) : (
          filteredHospitals.map(h => {
            const typeKey = getTypeDot(h.clCdNm);
            return (
              <div
                key={h.ykiho ?? `${h.yadmNm}-${h.addr}`}
                className="hcard"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(h)}
                onKeyDown={e => e.key === "Enter" && onSelect(h)}
              >
                <div className="hcard-type">
                  <span className={`type-dot ${typeKey}`}>{h.clCdNm ?? "기타"}</span>
                </div>
                <div className="hcard-body">
                  <p className="hcard-name">{h.yadmNm}</p>
                  <p className="hcard-meta">
                    {[h.sgguCdNm, h.addr].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="hcard-dr">
                  <Stethoscope size={12} />
                  {Number(h.drTotCnt ?? 0).toLocaleString()}명
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
