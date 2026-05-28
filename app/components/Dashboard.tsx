"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Bot, Building2, HeartPulse, LocateFixed, Search, Send, Stethoscope, X } from "lucide-react";
import { sgguMap } from "@/lib/sggu";
import { topDiseases } from "@/lib/disease";
import HospitalModal from "@/app/components/HospitalModal";

const HospitalMap = dynamic(() => import("@/app/components/HospitalMap"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--surface-2)",
      display: "grid", placeItems: "center",
      color: "var(--muted)", fontSize: 14,
    }}>
      지도를 불러오는 중...
    </div>
  ),
});

/* ── 타입 ─────────────────────────────────────────── */
type Hospital = {
  yadmNm?: string;
  clCdNm?: string;
  sgguCdNm?: string;
  addr?: string;
  telno?: string;
  hospUrl?: string;
  drTotCnt?: string | number;
  ykiho?: string;
  XPos?: string;
  YPos?: string;
};

type ApiPayload = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: Hospital | Hospital[] }; totalCount?: number | string };
  };
  error?: string;
  message?: string;
};

/* ── 상수 ─────────────────────────────────────────── */
const sidoOptions = [
  { name: "서울", code: "110000" }, { name: "부산", code: "210000" }, { name: "대구", code: "220000" },
  { name: "인천", code: "230000" }, { name: "광주", code: "240000" }, { name: "대전", code: "250000" },
  { name: "울산", code: "260000" }, { name: "경기", code: "310000" }, { name: "강원", code: "320000" },
  { name: "충북", code: "330000" }, { name: "충남", code: "340000" }, { name: "전북", code: "350000" },
  { name: "전남", code: "360000" }, { name: "경북", code: "370000" }, { name: "경남", code: "380000" },
  { name: "제주", code: "390000" }, { name: "세종", code: "410000" },
];

const TYPE_FILTERS = ["전체", "상급종합", "종합병원", "병원", "의원", "한의원", "치과"] as const;

const QUICK_QUESTIONS = [
  "이 지역 소아과는 어디 있나요?",
  "응급실 위치를 알려줘",
  "고혈압 진료 잘 보는 병원은?",
];

/* ── 유틸 ─────────────────────────────────────────── */
function normalize(item: Hospital | Hospital[] | undefined): Hospital[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

async function fetchHospitals(params: URLSearchParams) {
  const res = await fetch(`/api/hospital?${params}`);
  const ct = res.headers.get("content-type") ?? "";
  const payload: ApiPayload = ct.includes("json")
    ? await res.json()
    : parseXml(await res.text());

  if (!res.ok) throw new Error(payload.error ?? payload.message ?? `API 오류 ${res.status}`);

  const body = payload.response?.body;
  const header = payload.response?.header;
  return {
    hospitals: normalize(body?.items?.item),
    totalCount: Number(body?.totalCount ?? 0),
    msg: header?.resultMsg ?? "NORMAL SERVICE.",
  };
}

function parseXml(xml: string): ApiPayload {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = [...doc.querySelectorAll("item")].map((n) => ({
    yadmNm: n.querySelector("yadmNm")?.textContent ?? "",
    clCdNm: n.querySelector("clCdNm")?.textContent ?? "",
    sgguCdNm: n.querySelector("sgguCdNm")?.textContent ?? "",
    addr: n.querySelector("addr")?.textContent ?? "",
    telno: n.querySelector("telno")?.textContent ?? "",
    hospUrl: n.querySelector("hospUrl")?.textContent ?? "",
    drTotCnt: n.querySelector("drTotCnt")?.textContent ?? "",
    ykiho: n.querySelector("ykiho")?.textContent ?? "",
    XPos: n.querySelector("XPos")?.textContent ?? "",
    YPos: n.querySelector("YPos")?.textContent ?? "",
  }));
  return {
    response: {
      header: {
        resultCode: doc.querySelector("resultCode")?.textContent ?? "",
        resultMsg: doc.querySelector("resultMsg")?.textContent ?? "",
      },
      body: {
        totalCount: doc.querySelector("totalCount")?.textContent ?? "0",
        items: { item: items },
      },
    },
  };
}

function calcVulnerability(hospitals: Hospital[], totalCount: number) {
  if (!hospitals.length) return { score: 0, grade: "danger" as const, label: "데이터 없음" };
  const avgDr = hospitals.reduce((s, h) => s + Number(h.drTotCnt ?? 0), 0) / hospitals.length;
  const doctorScore = Math.min(40, (avgDr / 10) * 40);
  const upperCount = hospitals.filter(h => ["상급종합", "종합병원"].some(t => (h.clCdNm ?? "").includes(t))).length;
  const upperScore = Math.min(30, (upperCount / hospitals.length) * 100);
  const countScore = Math.min(30, (Math.log(Math.max(1, totalCount)) / Math.log(500)) * 30);
  const score = Math.round(doctorScore + upperScore + countScore);
  const grade = score >= 60 ? "good" as const : score >= 35 ? "warning" as const : "danger" as const;
  const label = grade === "good" ? "접근성 양호" : grade === "warning" ? "접근성 보통" : "의료 취약";
  return { score, grade, label };
}

function getTypeDot(clCdNm = "") {
  if (clCdNm.includes("상급종합")) return "상급종합";
  if (clCdNm.includes("종합병원")) return "종합병원";
  if (clCdNm.includes("병원"))    return "병원";
  if (clCdNm.includes("의원"))    return "의원";
  if (clCdNm.includes("한의"))    return "한의원";
  if (clCdNm.includes("치과"))    return "치과";
  return "other";
}

/* ── 컴포넌트 ─────────────────────────────────────── */
export default function Dashboard() {
  const [sidoCd, setSidoCd] = useState("110000");
  const [sgguCd, setSgguCd] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius, setRadius] = useState("3000");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [apiMsg, setApiMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const sgguOptions = sgguMap[sidoCd] ?? [];
  const selectedSido = sidoOptions.find(o => o.code === sidoCd)?.name ?? "";

  /* 첫 로드 시 자동 위치 요청 */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  /* 주 검색 fetch */
  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    setApiMsg("");
    const p = new URLSearchParams({ numOfRows: "30", pageNo: "1", _type: "json" });
    if (location) {
      p.set("xPos", String(location.longitude));
      p.set("yPos", String(location.latitude));
      p.set("radius", radius);
    } else {
      p.set("sidoCd", sidoCd);
      if (sgguCd) p.set("sgguCd", sgguCd);
    }
    if (keyword.trim()) p.set("yadmNm", keyword.trim());

    fetchHospitals(p)
      .then(({ hospitals: h, totalCount: t, msg }) => {
        if (ctrl.signal.aborted) return;
        setHospitals(h); setTotalCount(t); setApiMsg(msg);
      })
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;
        setHospitals([]); setTotalCount(0); setApiMsg(e.message);
      })
      .finally(() => { if (!ctrl.signal.aborted) setIsLoading(false); });

    return () => ctrl.abort();
  }, [sidoCd, sgguCd, keyword, location, radius]);

  const filteredHospitals = useMemo(() =>
    typeFilter ? hospitals.filter(h => (h.clCdNm ?? "").includes(typeFilter)) : hospitals,
    [hospitals, typeFilter]
  );

  const doctorCount = useMemo(() =>
    hospitals.reduce((s, h) => s + Number(h.drTotCnt ?? 0), 0), [hospitals]);

  const vulnerability = useMemo(() =>
    calcVulnerability(hospitals, totalCount), [hospitals, totalCount]);

  const upperCount = useMemo(() =>
    hospitals.filter(h => ["상급종합", "종합병원"].some(t => (h.clCdNm ?? "").includes(t))).length,
    [hospitals]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    hospitals.forEach(h => {
      const t = h.clCdNm ?? "";
      const key = (["상급종합", "종합병원", "병원", "의원", "한의", "치과"] as const)
        .find(k => t.includes(k)) ?? "기타";
      const label = key === "한의" ? "한의원" : key;
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return counts;
  }, [hospitals]);

  const SIDO_CENTERS: Record<string, [number, number]> = {
    "110000": [37.5665, 126.9780], "210000": [35.1796, 129.0756], "220000": [35.8714, 128.6014],
    "230000": [37.4563, 126.7052], "240000": [35.1595, 126.8526], "250000": [36.3504, 127.3845],
    "260000": [35.5384, 129.3114], "310000": [37.4138, 127.5183], "320000": [37.8228, 128.1555],
    "330000": [36.6358, 127.4914], "340000": [36.6588, 126.6728], "350000": [35.8242, 127.1480],
    "360000": [34.8679, 126.9910], "370000": [36.4919, 128.8889], "380000": [35.4606, 128.2132],
    "390000": [33.4996, 126.5312], "410000": [36.4800, 127.2890],
  };

  const mapCenter: [number, number] = location
    ? [location.latitude, location.longitude]
    : (SIDO_CENTERS[sidoCd] ?? [36.5, 127.5]);

  const mapZoom = location ? 14 : sidoCd === "110000" ? 12 : 10;

  const mainLabel = location
    ? `현재 위치 반경 ${Number(radius) / 1000}km`
    : [selectedSido, sgguOptions.find(o => o.code === sgguCd)?.name].filter(Boolean).join(" ");

  const statusClass = isLoading ? "loading" : apiMsg.includes("오류") || apiMsg.includes("실패") ? "error" : "ok";
  const statusText = isLoading ? "조회 중..." : apiMsg || "대기 중";

  async function askAi() {
    if (!question.trim()) return;
    setAiLoading(true);
    setAnswer("답변을 생성하고 있습니다...");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, context: { sido: mainLabel, totalCount, hospitals: hospitals.slice(0, 8) } }),
      });
      const data = await res.json() as { answer?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "AI API 호출 실패");
      setAnswer(data.answer ?? "응답이 비어 있습니다.");
    } catch (e) {
      setAnswer((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) { setApiMsg("위치 정보를 지원하지 않는 브라우저입니다."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      err => { setApiMsg(`위치 오류: ${err.message}`); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <>
      {isLoading && <div className="loading-bar" />}

      {/* ── 컴팩트 검색 바 ── */}
      <section className="search-bar">
        <div className="inner">
          <div className="sb-controls">
            <div className="search-group">
              <select
                value={sidoCd}
                onChange={e => { setLocation(null); setSidoCd(e.target.value); setSgguCd(""); }}
                disabled={!!location}
                style={{ minWidth: 72 }}
              >
                {sidoOptions.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
              </select>
              <select
                value={sgguCd}
                onChange={e => { setLocation(null); setSgguCd(e.target.value); }}
                disabled={!!location}
                style={{ minWidth: 96 }}
              >
                {sgguOptions.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
              </select>
            </div>

            <button
              type="button"
              className={`gps-btn sb-gps${location ? " active" : ""}`}
              onClick={location ? () => setLocation(null) : useGps}
            >
              <LocateFixed size={15} />
              {location ? "위치 해제" : "현재 위치"}
            </button>

            <div className="search-input-wrap sb-search">
              <Search size={14} />
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="병원 이름으로 검색"
              />
            </div>

            {location && (
              <select
                value={radius}
                onChange={e => setRadius(e.target.value)}
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

      {/* ── 지표 요약 스트립 ── */}
      <div className="stats-strip">
        <div className="inner">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">총 의료기관</span>
              <span className={`stat-value${isLoading ? " skeleton" : ""}`}>
                {isLoading ? "—" : totalCount.toLocaleString()}
                <span className="stat-unit">개</span>
              </span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">의사 수 합계</span>
              <span className={`stat-value${isLoading ? " skeleton" : ""}`}>
                {isLoading ? "—" : doctorCount.toLocaleString()}
                <span className="stat-unit">명</span>
              </span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">상급·종합병원</span>
              <span className={`stat-value${isLoading ? " skeleton" : ""}`}>
                {isLoading ? "—" : upperCount}
                <span className="stat-unit">개</span>
              </span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">의료 접근성</span>
              {isLoading
                ? <span className="stat-value skeleton">—</span>
                : (
                  <span className="stat-value">
                    {vulnerability.score}점
                    <span className={`badge ${vulnerability.grade}`} style={{ marginLeft: 6 }}>
                      {vulnerability.label}
                    </span>
                  </span>
                )
              }
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-label">조회 기준</span>
              <span className="stat-value stat-region">
                {isLoading ? "—" : mainLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 지도 + 병원 목록 (화면 대부분 차지) ── */}
      <div className="map-hero">
        <div className="inner">
          <div className="map-list-layout">
            <div className="map-pane">
              <HospitalMap
                hospitals={filteredHospitals}
                center={mapCenter}
                zoom={mapZoom}
                onSelect={setSelectedHospital}
              />
            </div>

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
                  {isLoading ? "조회 중..." : `${filteredHospitals.length}개 / 전체 ${totalCount.toLocaleString()}개`}
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
                        onClick={() => setSelectedHospital(h)}
                        onKeyDown={e => e.key === "Enter" && setSelectedHospital(h)}
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
          </div>
        </div>
      </div>

      {/* ── 스크롤 아래 콘텐츠 ── */}
      <div className="below-fold">
        <div className="inner">
          <div className="section-block">
            <div className="section-title-row">
              <HeartPulse size={18} color="var(--red)" />
              <div>
                <h2 className="section-title">많이 걸리는 질환 TOP 10</h2>
                <p className="section-sub">HIRA 건강보험심사평가원 2023년 전국 외래 상병 기준</p>
              </div>
            </div>
            <div className="disease-cards-row">
              {topDiseases.map(d => {
                const pct = Math.round((Number(d.patients.replace("만", "").replace(",", "")) /
                  Number(topDiseases[0].patients.replace("만", "").replace(",", ""))) * 100);
                return (
                  <div key={d.code} className="disease-card">
                    <div className="dc-top">
                      <span className="dc-rank" style={{ background: d.color }}>#{d.rank}</span>
                      <span className="dc-cat">{d.category}</span>
                    </div>
                    <p className="dc-name">{d.name}</p>
                    <p className="dc-code">{d.code}</p>
                    <div className="d-bar">
                      <span style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                    <p className="dc-patients">{d.patients}명</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI 상담 FAB ── */}
      <button
        className={`ai-fab${aiOpen ? " open" : ""}`}
        onClick={() => setAiOpen(o => !o)}
        aria-label="AI 의료 상담"
      >
        {aiOpen ? <X size={20} /> : <Bot size={20} />}
      </button>

      {/* ── AI 패널 ── */}
      {aiOpen && (
        <div className="ai-panel" id="chat">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Bot size={15} color="var(--green)" />
              AI 의료 상담
            </div>
            <button className="ai-panel-close" onClick={() => setAiOpen(false)}>
              <X size={15} />
            </button>
          </div>

          {!answer && (
            <div className="ai-quick-wrap">
              <p className="ai-quick-label">빠른 질문</p>
              <div className="ai-quick-btns">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    className="ai-quick-btn"
                    onClick={() => setQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {answer && (
            <div className="ai-panel-body">
              <div className="ai-answer">{answer}</div>
            </div>
          )}

          <div className="ai-panel-footer">
            <textarea
              className="ai-panel-textarea"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAi(); } }}
              placeholder="궁금한 점을 입력하세요 (Enter로 전송)"
              rows={2}
            />
            <button className="ai-panel-send" onClick={askAi} disabled={aiLoading || !question.trim()}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {selectedHospital && (
        <HospitalModal hospital={selectedHospital} onClose={() => setSelectedHospital(null)} />
      )}
    </>
  );
}
