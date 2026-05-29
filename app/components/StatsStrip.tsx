import { Activity, Building2, HeartPulse, MapPin, Stethoscope } from "lucide-react";

type Vulnerability = {
  score: number;
  grade: "good" | "warning" | "danger";
  label: string;
};

type Props = {
  isLoading: boolean;
  totalCount: number;
  doctorCount: number;
  upperCount: number;
  vulnerability: Vulnerability;
  mainLabel: string;
};

export default function StatsStrip({
  isLoading, totalCount, doctorCount, upperCount, vulnerability, mainLabel,
}: Props) {
  return (
    <div className="stats-strip">
      <div className="inner">
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card-icon green"><Building2 size={16} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">총 의료기관</span>
              <span className={`stat-card-value${isLoading ? " skeleton" : ""}`}>
                {isLoading ? "—" : totalCount.toLocaleString()}
                <span className="stat-card-unit">개</span>
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon blue"><Stethoscope size={16} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">의사 수</span>
              <span className={`stat-card-value${isLoading ? " skeleton" : ""}`}>
                {isLoading ? "—" : doctorCount.toLocaleString()}
                <span className="stat-card-unit">명</span>
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon purple"><HeartPulse size={16} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">상급·종합병원</span>
              <span className={`stat-card-value${isLoading ? " skeleton" : ""}`}>
                {isLoading ? "—" : upperCount}
                <span className="stat-card-unit">개</span>
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className={`stat-card-icon ${isLoading ? "green" : vulnerability.grade}`}>
              <Activity size={16} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-label">의료 접근성</span>
              {isLoading ? (
                <span className="stat-card-value skeleton">—</span>
              ) : (
                <span className="stat-card-value">
                  {vulnerability.score}점
                  <span className={`badge ${vulnerability.grade}`} style={{ marginLeft: 6, fontSize: 11 }}>
                    {vulnerability.label}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="stat-card stat-card-region">
            <div className="stat-card-icon muted"><MapPin size={16} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">조회 기준</span>
              <span className="stat-card-value stat-card-region-value">
                {isLoading ? "—" : mainLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
