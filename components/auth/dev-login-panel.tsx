import { devLoginAction } from "@/app/(auth)/actions";
import type { UserRole } from "@/types/auth";

const devRoles: Array<{ role: UserRole; label: string; description: string }> = [
  {
    role: "company",
    label: "참여기업으로 입장",
    description: "견적 요청 기업 화면 확인"
  },
  {
    role: "contractor",
    label: "전시업체로 입장",
    description: "업체 대시보드 화면 확인"
  },
  {
    role: "admin",
    label: "관리자로 입장",
    description: "관리자 접근 제어 확인"
  }
];

export function DevLoginPanel() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <section className="mt-6 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 p-4">
      <p className="text-sm font-black text-booth-blue">로컬 개발용 빠른 입장</p>
      <p className="mt-1 text-xs font-bold leading-5 text-booth-muted">
        Supabase 이메일 제한이 풀릴 때까지 로컬에서만 사용하는 우회 로그인입니다.
      </p>
      <div className="mt-4 grid gap-2">
        {devRoles.map((item) => (
          <form action={devLoginAction} key={item.role}>
            <input name="role" type="hidden" value={item.role} />
            <button
              className="flex w-full items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-booth-blue"
              type="submit"
            >
              <span>
                <strong className="block text-sm font-black text-booth-ink">
                  {item.label}
                </strong>
                <span className="text-xs font-bold text-booth-muted">
                  {item.description}
                </span>
              </span>
              <span className="text-sm font-black text-booth-blue">→</span>
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
