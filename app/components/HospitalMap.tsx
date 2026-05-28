"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapHospital = {
  yadmNm?: string;
  clCdNm?: string;
  sgguCdNm?: string;
  addr?: string;
  drTotCnt?: string | number;
  ykiho?: string;
  XPos?: string;
  YPos?: string;
};

const TYPE_COLOR: Record<string, string> = {
  상급종합: "#d63031",
  종합병원: "#2665c4",
  병원:    "#6e3ec0",
  의원:    "#18a05e",
  한의원:  "#c47c0a",
  치과:    "#0984e3",
};

function typeColor(clCdNm = "") {
  for (const [key, color] of Object.entries(TYPE_COLOR)) {
    if (clCdNm.includes(key)) return color;
  }
  return "#72857a";
}

function typeLabel(clCdNm = "") {
  for (const key of Object.keys(TYPE_COLOR)) {
    if (clCdNm.includes(key)) return key;
  }
  return "기타";
}

function makeDoctorIcon(size: number, color: string) {
  const tail = Math.round(size * 0.42);
  const total = size + tail;
  const half = Math.round(size * 0.3);
  return L.divIcon({
    className: "",
    iconSize: [size, total],
    iconAnchor: [size / 2, total],
    popupAnchor: [0, -(total + 4)],
    html: `
      <div style="
        width:${size}px;height:${total}px;
        position:relative;
        filter:drop-shadow(0 3px 7px rgba(0,0,0,.32));
      ">
        <div style="
          position:absolute;top:0;left:0;
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${color};
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="
            width:${size - 5}px;height:${size - 5}px;
            border-radius:50%;
            background:white;
            overflow:hidden;
            display:flex;align-items:center;justify-content:center;
          ">
            <img src="/doctor.png"
              style="width:${size - 9}px;height:${size - 9}px;object-fit:cover;border-radius:50%;" />
          </div>
        </div>
        <div style="
          position:absolute;
          bottom:0;
          left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:${half}px solid transparent;
          border-right:${half}px solid transparent;
          border-top:${tail}px solid ${color};
        "></div>
      </div>
    `,
  });
}

/* 지역 바뀌면 지도 중심 이동 */
function CenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [map, center, zoom]);
  return null;
}

export default function HospitalMap({
  hospitals,
  center,
  zoom = 11,
  onSelect,
}: {
  hospitals: MapHospital[];
  center: [number, number];
  zoom?: number;
  onSelect: (h: MapHospital) => void;
}) {
  const valid = hospitals.filter(
    h => h.XPos && h.YPos &&
      !isNaN(parseFloat(h.XPos)) && !isNaN(parseFloat(h.YPos)) &&
      parseFloat(h.YPos) > 30 && parseFloat(h.YPos) < 40  // 한국 범위 검증
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterUpdater center={center} zoom={zoom} />

        {valid.map(h => {
          const lat = parseFloat(h.YPos!);
          const lng = parseFloat(h.XPos!);
          const color = typeColor(h.clCdNm);
          const drCnt = Number(h.drTotCnt ?? 0);
          const size = drCnt > 200 ? 36 : drCnt > 50 ? 30 : drCnt > 10 ? 26 : 22;

          return (
            <Marker
              key={h.ykiho ?? `${lat}-${lng}`}
              position={[lat, lng]}
              icon={makeDoctorIcon(size, color)}
              eventHandlers={{ click: () => onSelect(h) }}
            >
              <Popup>
                <strong style={{ fontSize: 13 }}>{h.yadmNm}</strong>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>
                  {typeLabel(h.clCdNm)} · 의사 {drCnt.toLocaleString()}명
                </span>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* 범례 */}
      <div style={{
        position: "absolute",
        bottom: 24,
        right: 10,
        zIndex: 1000,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid #dde6e1",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,.1)",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: "#72857a", letterSpacing: ".06em", marginBottom: 2 }}>
          의료기관 종류
        </p>
        {Object.entries(TYPE_COLOR).map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            <span style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }} />
            {label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
          <span style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#72857a",
            flexShrink: 0,
          }} />
          기타
        </div>
      </div>

      {/* 원 크기 설명 */}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: 10,
        zIndex: 1000,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid #dde6e1",
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,.1)",
        fontSize: 11,
        color: "#72857a",
        lineHeight: 1.6,
      }}>
        <p style={{ fontWeight: 800, marginBottom: 2 }}>아이콘 크기 = 의사 수</p>
        <p>클릭하면 병원명·정보 표시</p>
        {valid.length < hospitals.length && (
          <p style={{ color: "#c47c0a", marginTop: 2 }}>
            좌표 없는 {hospitals.length - valid.length}개 미표시
          </p>
        )}
      </div>
    </div>
  );
}
