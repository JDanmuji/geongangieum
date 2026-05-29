"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { sgguMap } from "@/lib/sggu";
import { topDiseases } from "@/lib/disease";
import HospitalModal from "@/app/components/HospitalModal";
import OnboardingModal, { type OnboardResult } from "@/app/components/OnboardingModal";
import SearchBar, { sidoOptions } from "@/app/components/SearchBar";
import StatsStrip from "@/app/components/StatsStrip";
import HospitalList from "@/app/components/HospitalList";
import AiPanel from "@/app/components/AiPanel";
import type { Hospital } from "@/app/types";

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

/* ── 유틸 ─────────────────────────────────────────── */
type ApiPayload = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: Hospital | Hospital[] }; totalCount?: number | string };
  };
  error?: string;
  message?: string;
};

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
  const items = [...doc.querySelectorAll("item")].map(n => ({
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
  const upperCount = hospitals.filter(h =>
    ["상급종합", "종합병원"].some(t => (h.clCdNm ?? "").includes(t))
  ).length;
  const upperScore = Math.min(30, (upperCount / hospitals.length) * 100);
  const countScore = Math.min(30, (Math.log(Math.max(1, totalCount)) / Math.log(500)) * 30);
  const score = Math.round(doctorScore + upperScore + countScore);
  const grade = score >= 60 ? "good" as const : score >= 35 ? "warning" as const : "danger" as const;
  const label = grade === "good" ? "접근성 양호" : grade === "warning" ? "접근성 보통" : "의료 취약";
  return { score, grade, label };
}

const SIDO_CENTERS: Record<string, [number, number]> = {
  "110000": [37.5665, 126.9780], "210000": [35.1796, 129.0756], "220000": [35.8714, 128.6014],
  "230000": [37.4563, 126.7052], "240000": [35.1595, 126.8526], "250000": [36.3504, 127.3845],
  "260000": [35.5384, 129.3114], "310000": [37.4138, 127.5183], "320000": [37.8228, 128.1555],
  "330000": [36.6358, 127.4914], "340000": [36.6588, 126.6728], "350000": [35.8242, 127.1480],
  "360000": [34.8679, 126.9910], "370000": [36.4919, 128.8889], "380000": [35.4606, 128.2132],
  "390000": [33.4996, 126.5312], "410000": [36.4800, 127.2890],
};

const METRO_SIDOS = new Set([
  "110000", "210000", "220000", "230000", "240000", "250000", "260000", "410000",
]);

/* ── 컴포넌트 ─────────────────────────────────────── */
export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sidoCd, setSidoCd] = useState(() => searchParams.get("sido") ?? "110000");
  const [sgguCd, setSgguCd] = useState(() => searchParams.get("sggu") ?? "");
  const [keyword, setKeyword] = useState(() => searchParams.get("q") ?? "");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius, setRadius] = useState("3000");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [apiMsg, setApiMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardMounted, setOnboardMounted] = useState(false);

  const selectedSido = sidoOptions.find(o => o.code === sidoCd)?.name ?? "";
  const sgguOptions = sgguMap[sidoCd] ?? [];

  /* 온보딩 확인 */
  useEffect(() => {
    setOnboardMounted(true);
    const done = localStorage.getItem("geongangieum_onboarded");
    if (!done) {
      setShowOnboarding(true);
    } else {
      const saved = JSON.parse(done) as { sidoCd?: string; sgguCd?: string; interests?: string[] };
      if (saved.sidoCd) setSidoCd(saved.sidoCd);
      if (saved.sgguCd) setSgguCd(saved.sgguCd);
      if (saved.interests) setInterests(saved.interests);
    }
  }, []);

  function handleOnboardDone(result: OnboardResult) {
    localStorage.setItem("geongangieum_onboarded", JSON.stringify({
      sidoCd: result.sidoCd,
      sgguCd: result.sgguCd,
      interests: result.interests,
    }));
    setSidoCd(result.sidoCd);
    setSgguCd(result.sgguCd);
    setInterests(result.interests);
    if (result.useGps) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    }
    setShowOnboarding(false);
  }

  /* 첫 로드 자동 GPS (온보딩 완료 후) */
  useEffect(() => {
    const done = localStorage.getItem("geongangieum_onboarded");
    if (!done) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  /* URL 동기화 */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (location) return;
    const p = new URLSearchParams();
    p.set("sido", sidoCd);
    if (sgguCd) p.set("sggu", sgguCd);
    if (keyword.trim()) p.set("q", keyword.trim());
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [sidoCd, sgguCd, keyword, location, router]);

  /* 병원 데이터 fetch */
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

  /* 계산 값 */
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

  const hospitalCenter = useMemo<[number, number] | null>(() => {
    if (!sgguCd && !location) return null;
    const valid = hospitals.filter(
      h => h.XPos && h.YPos &&
        !isNaN(parseFloat(h.YPos)) && parseFloat(h.YPos) > 30 && parseFloat(h.YPos) < 40
    );
    if (valid.length < 2) return null;
    const lat = valid.reduce((s, h) => s + parseFloat(h.YPos!), 0) / valid.length;
    const lng = valid.reduce((s, h) => s + parseFloat(h.XPos!), 0) / valid.length;
    return [lat, lng];
  }, [hospitals, sgguCd, location]);

  const mapCenter: [number, number] = location
    ? [location.latitude, location.longitude]
    : hospitalCenter ?? (SIDO_CENTERS[sidoCd] ?? [36.5, 127.5]);

  const mapZoom = location ? 14 : sgguCd ? 14 : METRO_SIDOS.has(sidoCd) ? 12 : 10;

  const mainLabel = location
    ? `현재 위치 반경 ${Number(radius) / 1000}km`
    : [selectedSido, sgguOptions.find(o => o.code === sgguCd)?.name].filter(Boolean).join(" ");

  function handleGpsToggle() {
    if (location) { setLocation(null); return; }
    if (!navigator.geolocation) {
      setApiMsg("위치 정보를 지원하지 않는 브라우저입니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => setApiMsg(`위치 오류: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  return (
    <>
      {onboardMounted && showOnboarding && (
        <OnboardingModal onDone={handleOnboardDone} />
      )}
      {isLoading && <div className="loading-bar" />}

      <SearchBar
        sidoCd={sidoCd}
        sgguCd={sgguCd}
        keyword={keyword}
        radius={radius}
        location={location}
        isLoading={isLoading}
        apiMsg={apiMsg}
        onSidoChange={code => { setLocation(null); setSidoCd(code); setSgguCd(""); }}
        onSgguChange={code => { setLocation(null); setSgguCd(code); }}
        onKeywordChange={setKeyword}
        onRadiusChange={setRadius}
        onGpsToggle={handleGpsToggle}
      />

      <StatsStrip
        isLoading={isLoading}
        totalCount={totalCount}
        doctorCount={doctorCount}
        upperCount={upperCount}
        vulnerability={vulnerability}
        mainLabel={mainLabel}
      />

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
            <HospitalList
              hospitals={hospitals}
              filteredHospitals={filteredHospitals}
              totalCount={totalCount}
              isLoading={isLoading}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              onSelect={setSelectedHospital}
            />
          </div>
        </div>
      </div>

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
                const pct = Math.round(
                  (Number(d.patients.replace("만", "").replace(",", "")) /
                    Number(topDiseases[0].patients.replace("만", "").replace(",", ""))) * 100
                );
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

      <AiPanel
        context={{
          sido: mainLabel,
          totalCount,
          hospitals: hospitals.slice(0, 10),
          interests,
        }}
      />

      {selectedHospital && (
        <HospitalModal hospital={selectedHospital} onClose={() => setSelectedHospital(null)} />
      )}
    </>
  );
}
