export function formatDate(date: string | null | undefined) {
  if (!date) return "일정 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(date));
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "일정 미정";
  if (start && end && start !== end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate(start ?? end);
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "미정";
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return "미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  const today = new Date(new Date().toDateString()).getTime();
  const target = new Date(new Date(date).toDateString()).getTime();
  return Math.ceil((target - today) / 86400000);
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    admin: "관리자",
    approved: "인증 완료",
    active: "이용 중",
    closed: "마감",
    cancelled: "취소",
    company: "참여기업",
    contractor: "전시업체",
    draft: "작성 중",
    expired: "만료",
    inactive: "이용 중지",
    open: "견적 모집 중",
    pending: "검토 대기",
    rejected: "미선정",
    reviewing: "견적 검토 중",
    selected: "최종 선택",
    submitted: "제출 완료",
    shortlisted: "후보 선정",
    suspended: "이용 제한",
    trial: "체험 중",
    viewed: "기업 열람",
    withdrawn: "철회"
  };

  return labels[status] ?? status;
}

export function statusTone(status: string) {
  if (["approved", "active", "open", "selected", "trial"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (["rejected", "expired", "suspended", "cancelled", "withdrawn"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (["inactive", "draft", "closed"].includes(status)) {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  if (["pending", "reviewing", "submitted", "viewed", "shortlisted"].includes(status)) {
    return "bg-blue-50 text-booth-blue ring-blue-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}
