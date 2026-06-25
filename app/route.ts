import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { getDashboardPath } from "@/lib/auth/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rewriteLegacyHtml(html: string) {
  let rewritten = html
    .replaceAll("assets/", "/assets/")
    .replaceAll('href="schedule.html"', 'href="/exhibitions"')
    .replaceAll('href="quote.html"', 'href="/company/quote-requests/new"')
    .replaceAll('href="login.html"', 'href="/login"')
    .replaceAll('href="signup.html"', 'href="/signup"')
    .replaceAll("<title>ILV | 전시 부스 견적 플랫폼</title>", "<title>부스메이트 | 전시 부스 견적 플랫폼</title>")
    .replaceAll("ILV 홈", "부스메이트 홈")
    .replaceAll("ILV", "부스메이트")
    .replaceAll("부스딜러와 함께라면", "부스메이트와 함께라면")
    .replaceAll("B2B 전시 부스 매칭 1위", "B2B 전시 부스 매칭 플랫폼")
    .replaceAll("무료 견적", "회원가입")
    .replaceAll("2024 스마트테크 코리아", "2026 코리아빌드위크")
    .replaceAll("2024.06.19 - 06.21", "2026.02.04 - 02.07")
    .replaceAll("K-BEAUTY EXPO KOREA", "2026 AI 안전보건박람회")
    .replaceAll("2024.10.17 - 10.19", "2026.07.06 - 07.09")
    .replaceAll("국제게임전시회 G-STAR", "2026 카페디저트페어")
    .replaceAll("2024.11.14 - 11.17", "2026.08.13 - 08.16")
    .replaceAll("벡스코", "킨텍스")
    .replaceAll("현재 12개 업체 준비중", "Supabase 일정 연동")
    .replaceAll("현재 8개 업체 준비중", "견적 요청 가능")
    .replaceAll("현재 24개 업체 준비중", "참여기업 준비중")
    .replaceAll("고객센터 1588-0000 · 평일 10:00 - 18:00", "부스메이트 MVP · 전시부스 견적 중개 플랫폼");

  rewritten = rewritten.replace(
    /<nav class="nav-links">[\s\S]*?<\/nav>/,
    '<nav class="nav-links" aria-hidden="true"></nav>'
  );

  rewritten = rewritten.replace(
    /<div class="nav-actions">[\s\S]*?<\/div>/,
    `<div class="nav-actions">
        <a class="secondary-button" href="/login">로그인</a>
        <a class="primary-button" href="/signup">회원가입</a>
      </div>`
  );

  rewritten = rewritten.replaceAll('href="#schedule"', 'href="/exhibitions"');
  rewritten = rewritten.replace(
    "</style>",
    `.nav-links{display:none!important}.nav{grid-template-columns:auto auto}.nav-actions{margin-left:auto}</style>`
  );

  return rewritten;
}

export async function GET(request: Request) {
  const context = await getCurrentUserContext().catch(() => null);

  if (context) {
    return NextResponse.redirect(new URL(getDashboardPath(context.profile.role), request.url));
  }

  const htmlPath = path.join(process.cwd(), "legacy-static", "index.html");
  const html = await readFile(htmlPath, "utf8");

  return new Response(rewriteLegacyHtml(html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
