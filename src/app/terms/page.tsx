export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-5 py-10 text-text-primary md:px-8">
      <article className="glass-panel mx-auto max-w-3xl rounded-2xl p-6 leading-7 md:p-8">
        <p className="text-sm font-black text-accent-info">AI 관상가 고양이</p>
        <h1 className="mt-2 text-3xl font-black">이용약관</h1>
        <p className="mt-6">AI 관상가 고양이는 관상과 사주 컨셉을 활용한 엔터테인먼트형 독서 큐레이션 서비스입니다.</p>
        <p className="mt-4">
          서비스 결과는 의학적, 심리학적, 법적 판단이 아니며 대학 도서관 도서 탐색을 돕기 위한 추천 콘텐츠입니다.
        </p>
        <p className="mt-4">
          추천 도서의 실제 소장 여부와 위치는 MVP에서 준비한 도서 데이터로 제공되며, 학교 도서관 계약 시 실제 도서관 시스템
          연동으로 대체될 수 있습니다.
        </p>
        <p className="mt-4">
          사용자는 본인의 입력 정보와 촬영 이미지를 기반으로 생성된 결과가 재미와 도서 탐색을 위한 콘텐츠라는 점에 동의하고
          서비스를 이용합니다.
        </p>
      </article>
    </main>
  );
}
