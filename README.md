# 건강이음 🏥

> 공공데이터 기반 지역 의료 접근성 탐색 대시보드

**건강이음**은 HIRA 건강보험심사평가원 공공데이터와 Claude AI를 결합하여, 내 주변 의료기관 정보를 한눈에 보고 AI 상담까지 받을 수 있는 헬스케어 정보 플랫폼입니다.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

---

## 주요 기능

### 병원 탐색
- 시도 · 시군구 선택 또는 GPS 기반 현재 위치 반경(1 ~ 10km) 검색
- 병원명 키워드 검색
- 종별 필터: 상급종합 · 종합병원 · 병원 · 의원 · 한의원 · 치과

### 지도 시각화
- Leaflet 기반 인터랙티브 지도
- 병원 종별 색상 구분 마커 (의사 수에 따라 크기 동적 조절)
- 마커 클러스터링 (zoom 14 이상에서 자동 해제)

### 의료 접근성 점수
의사 수(40점) + 상급·종합병원 비율(30점) + 총 기관 수(30점)를 합산하여 지역 의료 취약도를 신호등으로 표시합니다.

| 등급 | 점수 | 의미 |
|------|------|------|
| 🟢 접근성 양호 | 60점 이상 | |
| 🟡 접근성 보통 | 35 ~ 59점 | |
| 🔴 의료 취약 | 34점 이하 | |

### AI 의료 상담 (Claude API)
- 현재 조회 중인 지역 병원 데이터를 컨텍스트로 제공
- 스트리밍 응답 — 답변을 실시간으로 확인
- 다중 턴 대화 — 이전 대화 맥락을 유지하며 연속 질문 가능
- 빠른 질문 버튼 제공 (소아과 · 응급실 · 고혈압 · 야간 진료)

### 다빈도 질환 정보
HIRA 2023년 전국 외래 상병 기준 TOP 10 질환 카드 (환자 수 · 진료과목)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript 5.8 |
| UI | React 19, Lucide React |
| 지도 | Leaflet, react-leaflet, react-leaflet-cluster |
| 차트 | Recharts |
| AI | Anthropic Claude API (claude-sonnet-4) |
| 공공데이터 | DATA.GO.KR HIRA 병원정보서비스 |
| 배포 | Vercel |

---

## 프로젝트 구조

```
app/
├── api/
│   ├── ai/route.ts              # Claude AI 스트리밍 상담 API
│   ├── hospital/route.ts        # HIRA 병원 검색 프록시
│   └── hospital-detail/route.ts # HIRA 병원 상세정보 프록시
├── components/
│   ├── Dashboard.tsx            # 메인 대시보드 (상태 관리 · 레이아웃)
│   ├── AiPanel.tsx              # AI 채팅 FAB + 패널
│   ├── HospitalMap.tsx          # Leaflet 지도
│   ├── HospitalList.tsx         # 병원 목록 + 종별 필터
│   ├── HospitalModal.tsx        # 병원 상세정보 모달
│   ├── OnboardingModal.tsx      # 초기 설정 온보딩
│   ├── SearchBar.tsx            # 검색 바
│   └── StatsStrip.tsx           # 통계 카드
├── types.ts                     # 공유 타입 (Hospital, ChatMessage)
└── globals.css                  # 전역 스타일

lib/
├── disease.ts                   # 다빈도 질환 TOP 10 정적 데이터
└── sggu.ts                      # 시도 · 시군구 코드 맵
```

---

## 시작하기

### 사전 준비

- Node.js 18 이상
- [DATA.GO.KR](https://www.data.go.kr) HIRA 병원정보서비스 API 키
- [Anthropic](https://console.anthropic.com) API 키

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/JDanmuji/geongangieum.git
cd geongangieum

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
```

`.env.local` 파일을 열고 API 키를 입력하세요:

```env
DATA_GO_KR_API_KEY=your_data_go_kr_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

```bash
# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

---

## 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `DATA_GO_KR_API_KEY` | HIRA 병원정보서비스 API 키 ([발급](https://www.data.go.kr/data/15051316/openapi.do)) | ✅ |
| `ANTHROPIC_API_KEY` | Claude AI API 키 ([발급](https://console.anthropic.com)) | ✅ |

---

## 데이터 출처

- **병원 정보**: 건강보험심사평가원(HIRA) 병원정보서비스 v2 (`getHospBasisList`, `getDtlInfo`, `getDgsbjtInfo`)
- **다빈도 질환**: HIRA 2023년 전국 외래 상병 통계 (TOP 10)
- **지도 타일**: OpenStreetMap

---

## 라이선스

MIT
