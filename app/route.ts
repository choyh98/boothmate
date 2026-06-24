import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rewriteLegacyHtml(html: string) {
  return html
    .replaceAll("assets/", "/assets/")
    .replaceAll('href="schedule.html"', 'href="/exhibitions"')
    .replaceAll('href="quote.html"', 'href="/company/quote-requests/new"')
    .replaceAll('href="login.html"', 'href="/login"')
    .replaceAll('href="signup.html"', 'href="/signup"')
    .replaceAll("<title>ILV | 전시 부스 견적 플랫폼</title>", "<title>부스메이트 | 전시 부스 견적 플랫폼</title>");
}

export async function GET() {
  const htmlPath = path.join(process.cwd(), "legacy-static", "index.html");
  const html = await readFile(htmlPath, "utf8");

  return new Response(rewriteLegacyHtml(html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
