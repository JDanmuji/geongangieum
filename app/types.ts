export type Hospital = {
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

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
