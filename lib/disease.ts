export type DiseaseItem = {
  rank: number;
  name: string;
  code: string;
  category: string;
  patients: string;
  color: string;
};

// HIRA 건강보험심사평가원 2023년 다빈도 외래 상병 통계
export const topDiseases: DiseaseItem[] = [
  { rank: 1,  name: "급성기관지염",     code: "J20", category: "호흡기계",  patients: "2,342만", color: "#1c7c54" },
  { rank: 2,  name: "치은염·치주질환",  code: "K05", category: "구강",      patients: "1,823만", color: "#246b9f" },
  { rank: 3,  name: "본태성 고혈압",    code: "I10", category: "순환기계",  patients: "1,402만", color: "#bd3f32" },
  { rank: 4,  name: "급성 상기도감염",  code: "J06", category: "호흡기계",  patients: "1,318만", color: "#9c6d12" },
  { rank: 5,  name: "2형 당뇨병",      code: "E11", category: "내분비계",  patients: "629만",   color: "#6b459f" },
  { rank: 6,  name: "등통증",          code: "M54", category: "근골격계",  patients: "583만",   color: "#7a4f2e" },
  { rank: 7,  name: "급성 편도염",     code: "J03", category: "호흡기계",  patients: "541만",   color: "#0b7a75" },
  { rank: 8,  name: "위·식도역류병",   code: "K21", category: "소화기계",  patients: "516만",   color: "#9b2c63" },
  { rank: 9,  name: "지질 대사 장애",  code: "E78", category: "내분비계",  patients: "478만",   color: "#1a4e8c" },
  { rank: 10, name: "무릎 관절증",     code: "M17", category: "근골격계",  patients: "446만",   color: "#4a7c59" },
];
