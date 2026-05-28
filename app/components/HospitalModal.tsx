"use client";

import { useEffect, useState } from "react";
import { Globe, MapPin, Phone, Stethoscope, X } from "lucide-react";

type Hospital = {
  yadmNm?: string;
  clCdNm?: string;
  sgguCdNm?: string;
  addr?: string;
  telno?: string;
  hospUrl?: string;
  drTotCnt?: string | number;
  ykiho?: string;
};

type DetailItem = {
  yadmNm?: string;
  addr?: string;
  telno?: string;
  hospUrl?: string;
  estbDd?: string;
  drTotCnt?: string | number;
  clCdNm?: string;
};

type DeptItem = {
  dgsbjtCdNm?: string;
  dgsbjtCd?: string;
};

type ApiBody<T> = {
  response?: { body?: { items?: { item?: T | T[] } } };
};

function normalize<T>(item: T | T[] | undefined): T[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

export default function HospitalModal({ hospital, onClose }: {
  hospital: Hospital;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [departments, setDepartments] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospital.ykiho) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const [detailRes, deptRes] = await Promise.all([
          fetch(`/api/hospital-detail?type=detail&ykiho=${hospital.ykiho}&_type=json`, { signal: controller.signal }),
          fetch(`/api/hospital-detail?type=departments&ykiho=${hospital.ykiho}&_type=json`, { signal: controller.signal }),
        ]);
        const detailData = (await detailRes.json()) as ApiBody<DetailItem>;
        const deptData = (await deptRes.json()) as ApiBody<DeptItem>;

        const items = normalize(detailData.response?.body?.items?.item);
        setDetail(items[0] ?? null);
        setDepartments(normalize(deptData.response?.body?.items?.item));
      } catch {
        // abort or network error — show base info
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [hospital.ykiho]);

  const addr = detail?.addr || hospital.addr;
  const telno = detail?.telno || hospital.telno;
  const hospUrl = detail?.hospUrl || hospital.hospUrl;
  const drTotCnt = Number(detail?.drTotCnt ?? hospital.drTotCnt ?? 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{hospital.yadmNm}</h2>
            {hospital.clCdNm && <span className="badge good">{hospital.clCdNm}</span>}
            {hospital.sgguCdNm && <span className="badge" style={{ background: "var(--blue-soft)", color: "var(--blue)", marginLeft: 6 }}>{hospital.sgguCdNm}</span>}
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className="muted" style={{ padding: "20px 0" }}>상세 정보를 조회 중입니다...</p>
        ) : (
          <div className="modal-body">
            {addr && (
              <div className="detail-row">
                <MapPin size={15} />
                <span>{addr}</span>
              </div>
            )}
            {telno && (
              <div className="detail-row">
                <Phone size={15} />
                <a href={`tel:${telno}`} className="detail-link">{telno}</a>
              </div>
            )}
            {hospUrl && (
              <div className="detail-row">
                <Globe size={15} />
                <a href={hospUrl.startsWith("http") ? hospUrl : `http://${hospUrl}`} target="_blank" rel="noopener noreferrer" className="detail-link">
                  {hospUrl}
                </a>
              </div>
            )}
            <div className="detail-row">
              <Stethoscope size={15} />
              <span>총 의사 <strong>{drTotCnt.toLocaleString()}</strong>명</span>
            </div>
            {detail?.estbDd && (
              <div className="detail-row">
                <span className="muted" style={{ fontSize: 13 }}>설립일: {formatDate(String(detail.estbDd))}</span>
              </div>
            )}

            {departments.length > 0 && (
              <div className="dept-section">
                <p className="dept-label">진료과목 ({departments.length}개)</p>
                <div className="dept-tags">
                  {departments.map((d, i) => (
                    <span key={d.dgsbjtCd ?? i} className="dept-tag">{d.dgsbjtCdNm}</span>
                  ))}
                </div>
              </div>
            )}

            {!hospital.ykiho && (
              <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>ykiho 값이 없어 상세 API 조회가 불가합니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length === 8) {
    return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
  }
  return yyyymmdd;
}
