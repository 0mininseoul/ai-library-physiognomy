export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-5 py-10 text-text-primary md:px-8">
      <article className="glass-panel mx-auto max-w-3xl rounded-2xl p-6 leading-7 md:p-8">
        <p className="text-sm font-black text-accent-info">AI 관상가 고양이</p>
        <h1 className="mt-2 text-3xl font-black">개인정보처리방침</h1>
        <p className="mt-6">
          AI 관상가 고양이는 결과 제공과 30일 내 재조회를 위해 이름, 학번(또는 사번), 성별, 생년월일, 선호하는 책 카테고리,
          얼굴 이미지, 얼굴 분석 지표, 추천 결과를 처리해요.
        </p>
        <p className="mt-4">
          얼굴 이미지는 결과 화면에서 생성 후 30일 동안 표시돼요.
        </p>
        <p className="mt-4">
          개인 결과와 추천 기록은 30일간 보관되며, 이후 개인 식별 정보와 개별 결과 원문은 삭제돼요. 장기 보관 데이터는 개인을
          재식별할 수 없는 집계 통계만 남겨요.
        </p>
        <p className="mt-4">
          관리자 화면에는 오늘 참여자 수, 추천된 책 수, 선호하는 책 카테고리, 추천 분야와 태그, 세션 목록 등 시연 운영에
          필요한 집계 데이터가 표시돼요.
        </p>
      </article>
    </main>
  );
}
