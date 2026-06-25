import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "전시 일정 선택",
    body: "참가할 전시회를 고르면 견적 요청서의 전시 정보가 자동으로 채워집니다.",
    href: "/exhibitions",
    action: "전시 일정 보기"
  },
  {
    title: "요청서 작성",
    body: "부스 규모, 예산, 필요 항목, 디자인 방향을 입력하고 임시저장 또는 공개 요청으로 제출합니다.",
    href: "/company/quote-requests/new",
    action: "견적 요청 작성"
  },
  {
    title: "견적 비교",
    body: "제출된 견적의 금액, 포함 항목, 제작 일정, 업체 인증 상태를 비교합니다.",
    href: "/company/quote-requests",
    action: "내 요청 확인"
  },
  {
    title: "최종 업체 선택",
    body: "유효기간이 남아있는 견적 중 하나를 선택하면 나머지 견적은 미선정 처리됩니다.",
    href: "/company/quote-requests",
    action: "진행 상태 보기"
  }
];

export default async function CompanyGuidePage() {
  await requireRole("company");

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8">
        <section className="rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
          <p className="text-sm font-black text-booth-blue">이용방법</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <h1 className="text-4xl font-black leading-tight text-booth-ink">
                전시부스 견적 요청부터 업체 선택까지
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-booth-muted">
                부스메이트는 참여기업이 요청서를 공개하고, 인증된 전시업체가 견적을 제출한 뒤 비교와 선택까지 이어지는 업무형 플랫폼입니다.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-black text-blue-300">현재 MVP 제공 범위</p>
              <ul className="mt-4 grid gap-3 text-sm font-bold leading-6 text-slate-200">
                <li>전시 일정 기반 견적 요청</li>
                <li>업체 견적 제출 및 임시저장</li>
                <li>최대 4개 견적 비교</li>
                <li>최종 업체 선택 상태 관리</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <article className="rounded-[24px] border border-white/80 bg-white p-6 shadow-sm" key={step.title}>
              <span className="text-sm font-black text-booth-blue">STEP {index + 1}</span>
              <h2 className="mt-3 text-xl font-black text-booth-ink">{step.title}</h2>
              <p className="mt-3 text-sm font-bold leading-7 text-booth-muted">{step.body}</p>
              <Link className="mt-5 inline-flex rounded-xl border border-booth-line bg-slate-50 px-4 py-3 text-sm font-black text-booth-ink" href={step.href}>
                {step.action}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[24px] border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-black text-blue-950">아직 제공하지 않는 기능</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-blue-800">
            채팅, 연락처 공개, 결제, 계약, 알림, 후기 기능은 준비 중입니다. 현재는 견적 요청, 견적 비교, 최종 선택까지의 핵심 흐름을 안정적으로 제공합니다.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
