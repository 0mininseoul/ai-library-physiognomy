"use client";

import { FormEvent, useState } from "react";
import { Badge, BookOpenCheck, CalendarDays, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { BOOK_CATEGORIES } from "@/lib/books/categories";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Gender, StudentInput } from "@/types/session";

type EntryPageProps = {
  onStart: (input: StudentInput) => void;
};

export function EntryPage({ onStart }: EntryPageProps) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [favoriteCategory, setFavoriteCategory] = useState<string>(BOOK_CATEGORIES[0]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedStudentId = studentId.trim();

    if (!trimmedName || !trimmedStudentId || !gender || !birthDate || !favoriteCategory) {
      setError("빈칸 있으면 고양이 청진기가 삐빅거려요. 전부 채워줘.");
      return;
    }
    if (!consentAccepted) {
      setError("동의 체크가 필요해. 고양이도 개인정보 앞에서는 진지해져.");
      return;
    }

    setError(null);
    onStart({
      name: trimmedName,
      studentId: trimmedStudentId,
      gender,
      birthDate,
      favoriteCategory,
      consentAccepted,
    });
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_22rem] md:px-8">
        <form onSubmit={submit} className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-prescription">AI 관상가 고양이</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-normal text-ink md:text-5xl">
                관상 찍고, 오늘 대출할 책 처방받기
              </h1>
            </div>
            <Sparkles className="mt-1 h-7 w-7 shrink-0 text-prescription" aria-hidden="true" />
          </div>

          <div className="grid gap-5">
            <Input
              label="이름"
              name="name"
              value={name}
              placeholder="박영민"
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />

            <Input
              label="학번"
              name="studentId"
              value={studentId}
              placeholder="20260000"
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => setStudentId(event.target.value)}
            />

            <fieldset className="grid gap-2">
              <legend className="text-sm font-bold text-ink">성별</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "male" as const, label: "남성" },
                  { value: "female" as const, label: "여성" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`min-h-12 rounded-lg border px-4 text-sm font-black transition ${
                      gender === option.value
                        ? "border-library bg-library text-white"
                        : "border-ink/10 bg-white text-ink hover:border-library/40 hover:bg-library/5"
                    }`}
                    onClick={() => setGender(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <Input
              label="생년월일"
              name="birthDate"
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setBirthDate(event.target.value)}
            />

            <Select label="선호 독서 카테고리" name="favoriteCategory" value={favoriteCategory} onChange={(event) => setFavoriteCategory(event.target.value)}>
              {BOOK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>

            <Checkbox
              name="consentAccepted"
              checked={consentAccepted}
              onChange={(event) => setConsentAccepted(event.target.checked)}
              label="개인정보처리방침 및 이용약관 동의"
              helper="얼굴 이미지는 24시간 이후 삭제됩니다."
            />
          </div>

          {error ? (
            <p role="alert" className="mt-5 rounded-lg bg-prescription/10 px-4 py-3 text-sm font-bold text-prescription">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full">
            <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            고양이 선생님 호출
          </Button>
        </form>

        <aside className="rounded-lg border border-library/10 bg-[#f4f7f1] p-5 text-center shadow-sm md:p-6">
          <Mascot variant="idle" size="lg" message="관상+사주 보고, 대출 욕구까지 같이 진단해드림" />
          <div className="mt-6 grid grid-cols-3 gap-2 text-xs font-black text-ink/70">
            <span className="rounded-lg bg-white px-2 py-3">
              <UserRound className="mx-auto mb-1 h-4 w-4 text-library" aria-hidden="true" />
              관상
            </span>
            <span className="rounded-lg bg-white px-2 py-3">
              <CalendarDays className="mx-auto mb-1 h-4 w-4 text-library" aria-hidden="true" />
              사주
            </span>
            <span className="rounded-lg bg-white px-2 py-3">
              <Badge className="mx-auto mb-1 h-4 w-4 text-library" aria-hidden="true" />
              책처방
            </span>
          </div>
          <p className="mt-5 inline-flex items-center justify-center gap-2 text-xs font-bold leading-5 text-ink/60">
            <ShieldCheck className="h-4 w-4 text-library" aria-hidden="true" />
            시연용 데이터는 관리자 화면에서 집계됩니다.
          </p>
        </aside>
      </section>
    </main>
  );
}
