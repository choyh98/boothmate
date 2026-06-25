import Link from "next/link";
import { statusLabel, statusTone } from "@/lib/format";

type StateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel }: StateProps) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-black text-booth-ink">{title}</p>
      {description ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-booth-muted">{description}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link className="mt-5 inline-flex rounded-xl bg-booth-blue px-5 py-3 text-sm font-black text-white" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorState({ title, description }: StateProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
      <p className="font-black">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 md:px-8">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <h1 className="text-2xl font-black">접근 권한이 없습니다.</h1>
        <p className="mt-3 text-sm font-bold leading-7">로그인 상태와 계정 역할을 확인한 뒤 다시 시도해주세요.</p>
      </div>
    </div>
  );
}

export function LoadingState({ title = "불러오는 중입니다." }: { title?: string }) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-black text-booth-muted">{title}</p>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${statusTone(status)}`}>
      {label ?? statusLabel(status)}
    </span>
  );
}
