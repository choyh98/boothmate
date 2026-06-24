import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { getPublicEnvStatus } from "@/lib/config/env";

const phaseItems = [
  "정적 MVP 보존",
  "Next.js 앱 구조 생성",
  "TypeScript strict 설정",
  "Tailwind 디자인 토큰 설정",
  "Supabase 클라이언트 준비"
];

const nextSteps = [
  "인증과 역할 모델",
  "견적 요청 임시저장/제출",
  "전시업체 공개 요청 조회",
  "견적 비교와 업체 선택"
];

export default function HomePage() {
  const envStatus = getPublicEnvStatus();

  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-6xl flex-col px-5 py-12 md:px-8">
        <section className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-sm font-extrabold text-booth-blue shadow-sm">
              Phase 1 구조 정리 진행 중
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.14] tracking-normal text-booth-ink md:text-6xl">
              부스메이트 MVP를
              <br />
              새 앱 구조로 정리합니다.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-booth-muted">
              기존 정적 화면은 `legacy-static`에 보존했고, 지금부터는 Next.js,
              TypeScript, Tailwind CSS, Supabase를 기준으로 실제 서비스 흐름을
              단계별로 연결합니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="rounded-xl bg-booth-blue px-6 py-4 text-base font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-blue-700"
                href="#status"
              >
                구조 확인
              </a>
              <a
                className="rounded-xl border border-booth-line bg-white px-6 py-4 text-base font-black text-booth-ink shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
                href="#next"
              >
                다음 Phase 보기
              </a>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between border-b border-booth-line pb-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">
                  Boothmate
                </p>
                <h2 className="mt-2 text-2xl font-black text-booth-ink">
                  기본 앱 상태
                </h2>
              </div>
              <Image src="/logo.svg" alt="부스메이트" width={118} height={36} priority />
            </div>

            <div id="status" className="mt-6 grid gap-3">
              {phaseItems.map((item) => (
                <div
                  className="flex items-center justify-between rounded-2xl border border-booth-line bg-slate-50 px-4 py-3"
                  key={item}
                >
                  <span className="font-extrabold text-booth-ink">{item}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-booth-blue">
                    완료
                  </span>
                </div>
              ))}
              <div className="mt-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
                <p className="text-sm font-black text-booth-blue">Supabase 환경변수</p>
                <p className="mt-2 text-sm font-bold leading-6 text-booth-muted">
                  URL: {envStatus.hasUrl ? "설정됨" : "미설정"} · Anon Key:{" "}
                  {envStatus.hasAnonKey ? "설정됨" : "미설정"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="next" className="grid gap-4 pb-8 pt-10 md:grid-cols-4">
          {nextSteps.map((step, index) => (
            <article
              className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm"
              key={step}
            >
              <span className="text-sm font-black text-booth-blue">
                0{index + 2}
              </span>
              <h3 className="mt-3 text-lg font-black text-booth-ink">{step}</h3>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
