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
  if (!value) return "미정";
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "임시저장",
    open: "견적 모집중",
    reviewing: "검토중",
    selected: "업체 선택",
    closed: "마감",
    cancelled: "취소",
    submitted: "제출 완료",
    viewed: "열람됨",
    shortlisted: "후보 선정",
    rejected: "미선정",
    withdrawn: "철회"
  };

  return labels[status] ?? status;
}
