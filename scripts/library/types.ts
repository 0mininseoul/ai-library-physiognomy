export type GachonRawBook = {
  sourceLabel: "bookcuration" | "openlibrary";
  registrationNo: string; // UEM...
  title: string;
  author: string;
  publisher: string;
  publishedYear: number | null;
  callNumber: string;
  locationLabel: string; // 소장처 (예: "중앙도서관")
  locationRoom: string;  // 자료실 (예: "북큐레이션코너(1층)")
  shelf?: string;        // 서가 (오픈라이브러리만)
  status: string;        // 자료상태 (예: "이용가능")
  availability: "available" | "checked_out" | null;
};
