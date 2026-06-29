import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/get-current-user";
import { getDashboardPath } from "@/lib/auth/routes";
import { formatDateRange } from "@/lib/format";
import { listExhibitions } from "@/lib/exhibitions/queries";
import type { Exhibition } from "@/types/exhibition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const calendarStyles = `
.calendar-showcase{position:relative;z-index:1;max-width:1100px;margin:0 auto}
.calendar-showcase .events-header{margin-bottom:26px}
.calendar-showcase .events-header p{display:none}
.calendar-board{display:grid;grid-template-columns:220px minmax(0,1fr);border:1px solid #dbe4f0;border-radius:16px;background:white;box-shadow:0 18px 42px rgba(15,23,42,.1);overflow:hidden}
.calendar-month{display:flex;min-height:100%;flex-direction:column;justify-content:center;gap:18px;padding:28px;color:white;background:linear-gradient(145deg,#003ec2,#0056ff 58%,#48c6ff)}
.calendar-month strong{display:block;margin-top:16px;font-family:"Inter",sans-serif;font-size:58px;line-height:.92;font-weight:900}
.calendar-month span{display:block;font-size:20px;line-height:1.2;font-weight:900}
.calendar-mark{display:inline-flex;width:fit-content;border:1px solid rgba(255,255,255,.42);border-radius:999px;padding:7px 11px;color:rgba(255,255,255,.86);font-family:"Inter",sans-serif;font-size:11px;font-style:normal;font-weight:900;letter-spacing:.08em}
.calendar-list-wrap{position:relative;min-width:0;background:linear-gradient(180deg,#ffffff,#f8fbff);overflow:hidden}
.calendar-list{display:grid;min-height:345px}
.calendar-list-wrap::before,.calendar-list-wrap::after{position:absolute;top:0;bottom:0;z-index:1;width:86px;pointer-events:none;content:""}
.calendar-list-wrap::before{left:0;background:linear-gradient(90deg,#fff,rgba(255,255,255,0))}
.calendar-list-wrap::after{right:0;background:linear-gradient(270deg,#fff,rgba(255,255,255,0))}
.calendar-nav{position:absolute;top:50%;z-index:3;display:grid;width:44px;height:72px;place-items:center;border:1px solid rgba(0,86,255,.18);border-radius:999px;background:rgba(255,255,255,.92);color:#0f172a;font-size:0;font-weight:900;line-height:1;box-shadow:0 18px 34px rgba(15,23,42,.16),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(14px);cursor:pointer;transform:translateY(-50%);transition:transform .22s ease,border-color .22s ease,color .22s ease,box-shadow .22s ease,background .22s ease,opacity .2s ease}
.calendar-nav::before{display:grid;width:30px;height:30px;place-items:center;border-radius:999px;background:#0056ff;color:white;font-size:24px;line-height:26px;box-shadow:0 10px 20px rgba(0,86,255,.28);transition:transform .22s ease,background .22s ease;content:attr(data-arrow)}
.calendar-nav:hover{border-color:rgba(0,86,255,.45);background:white;box-shadow:0 22px 42px rgba(0,86,255,.22),inset 0 1px 0 rgba(255,255,255,.95);transform:translateY(-50%) scale(1.04)}
.calendar-nav:hover::before{background:#0046d8;transform:scale(1.08)}
.calendar-nav:focus-visible{outline:3px solid rgba(0,86,255,.22);outline-offset:3px}
.calendar-nav[hidden]{display:none}
.calendar-prev{left:16px}
.calendar-next{right:16px}
.calendar-item{display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:18px;align-items:center;padding:22px 78px;border-bottom:1px solid #e2e8f0;transition:background .2s ease}
.calendar-item:hover{background:#f4f8ff}
.calendar-item[hidden]{display:none}
.calendar-item:last-child{border-bottom:0}
.calendar-date{display:grid;width:70px;height:70px;place-items:center;border:1px solid #dbe4f0;border-radius:14px;background:#f8fafc;font-family:"Inter",sans-serif;font-weight:900}
.calendar-date b{display:block;font-size:27px;line-height:1;color:#0f172a}
.calendar-date span{display:block;margin-top:2px;color:#64748b;font-size:11px}
.calendar-copy h3{margin:0;color:#0f172a;font-size:20px;line-height:1.25}
.calendar-copy p{margin:7px 0 0;color:#64748b;font-size:14px;font-weight:800}
.calendar-chip{white-space:nowrap;border-radius:999px;background:#eef4ff;padding:8px 12px;color:#0056ff;font-size:12px;font-weight:900}
.calendar-dday{white-space:nowrap;border-radius:999px;background:#0056ff;padding:8px 12px;color:white;font-size:12px;font-weight:900}
.landing-footer{border-top:1px solid rgba(15,23,42,.1);background:#dfe6ef}
.landing-footer-inner{display:flex;width:min(1120px,calc(100% - 36px));margin:0 auto;padding:32px 4px;align-items:center;justify-content:space-between;gap:18px}
.landing-footer-brand{display:flex;align-items:center;gap:16px}
.landing-footer-brand img{width:128px;height:auto;filter:grayscale(1);opacity:.5}
.landing-footer-brand p{margin:0;color:#64748b;font-size:14px;font-weight:700}
.landing-footer-code{color:#94a3b8;font-size:12px;font-weight:800;letter-spacing:0}
@media (max-width: 760px){.calendar-showcase .events-header{display:flex;align-items:center}.calendar-board{grid-template-columns:1fr}.calendar-month{min-height:150px}.calendar-list{min-height:auto}.calendar-list-wrap::before,.calendar-list-wrap::after{width:62px}.calendar-nav{width:38px;height:58px}.calendar-nav::before{width:26px;height:26px;font-size:21px;line-height:22px}.calendar-prev{left:10px}.calendar-next{right:10px}.calendar-item{grid-template-columns:70px minmax(0,1fr);padding:18px 54px}.calendar-chip{grid-column:2;width:fit-content}.calendar-copy h3{font-size:17px}.calendar-dday{grid-column:2;width:fit-content}.landing-footer-inner{display:block}.landing-footer-brand{align-items:flex-start;flex-direction:column}.landing-footer-code{margin-top:14px}}
`;

const processStyles = `
.workflow-section{position:relative;min-height:190vh;padding-top:0;background:#f8fafc}
.workflow-showcase{position:sticky;top:96px;display:grid;grid-template-columns:minmax(280px,.8fr) minmax(0,1.2fr);gap:clamp(28px,5vw,72px);align-items:center;max-width:1100px;min-height:calc(100vh - 112px);margin:0 auto;padding-block:clamp(42px,6vw,72px)}
.workflow-copy{position:relative}
.workflow-label{display:inline-flex;align-items:center;gap:8px;border:1px solid #dbe4f0;border-radius:999px;background:white;padding:8px 12px;color:#0056ff;font-family:"Inter",sans-serif;font-size:12px;font-weight:900;letter-spacing:0;opacity:0;transform:translateY(14px);transition:opacity .55s ease,transform .55s ease}
.workflow-copy h2{max-width:480px;margin:18px 0 0;color:#0f172a;font-size:clamp(36px,5vw,58px);line-height:1.04;font-weight:900;letter-spacing:0}
.workflow-title-line{display:block;width:fit-content;opacity:0;filter:blur(7px);transition:opacity .72s cubic-bezier(.2,.78,.15,1),transform .72s cubic-bezier(.2,.78,.15,1),filter .72s ease}
.workflow-title-line:nth-child(1){transform:translateX(-36px);transition-delay:.08s}
.workflow-title-line:nth-child(2){margin-top:4px;color:#0056ff;transform:translateX(36px);transition-delay:.2s}
.workflow-copy p{max-width:430px;margin:18px 0 0;color:#64748b;font-size:16px;line-height:1.75;font-weight:750}
.workflow-copy-fragment{display:inline;opacity:0;filter:blur(5px);transform:translateY(12px);transition:opacity .55s ease,transform .55s ease,filter .55s ease}
.workflow-copy-fragment:nth-child(1){transition-delay:.32s}
.workflow-copy-fragment:nth-child(2){transition-delay:.42s}
.workflow-copy-fragment:nth-child(3){transition-delay:.52s}
.workflow-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.workflow-actions{opacity:0;transform:translateY(18px);transition:opacity .62s ease .24s,transform .62s ease .24s}
.workflow-primary,.workflow-secondary{display:inline-flex;min-height:46px;align-items:center;justify-content:center;border-radius:10px;padding:0 18px;font-size:14px;font-weight:900;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease,color .2s ease,background .2s ease}
.workflow-primary{background:#0056ff;color:white;box-shadow:0 14px 28px rgba(0,86,255,.22)}
.workflow-primary:hover{background:#0046d8;box-shadow:0 18px 34px rgba(0,86,255,.28);transform:translateY(-2px)}
.workflow-secondary{border:1px solid #dbe4f0;background:white;color:#0f172a}
.workflow-secondary:hover{border-color:#b8ccff;color:#0056ff;box-shadow:0 12px 24px rgba(15,23,42,.08);transform:translateY(-2px)}
.workflow-board{position:relative;height:min(560px,calc(100vh - 180px));min-height:480px;border:1px solid #dbe4f0;border-radius:30px;background:linear-gradient(145deg,#ffffff 0%,#f6f9ff 58%,#eef5ff 100%);box-shadow:0 28px 70px rgba(15,23,42,.12);overflow:hidden}
.workflow-board::before{position:absolute;inset:0;background-image:linear-gradient(rgba(0,86,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,86,255,.06) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(180deg,rgba(0,0,0,.82),rgba(0,0,0,.14));content:""}
.workflow-card{position:absolute;left:34px;right:34px;top:50%;display:grid;grid-template-columns:76px minmax(0,1fr);gap:20px;align-items:start;border:1px solid rgba(219,228,240,.92);border-radius:24px;background:rgba(255,255,255,.92);padding:26px;box-shadow:0 18px 42px rgba(15,23,42,.11);opacity:0;transform:translate3d(0,-50%,0) scale(.78);transform-origin:center;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease;will-change:opacity,transform;backdrop-filter:blur(18px)}
.workflow-card:nth-child(1){transition-delay:.06s}
.workflow-card:nth-child(2){transition-delay:.14s}
.workflow-card:nth-child(3){transition-delay:.22s}
.workflow-card:nth-child(4){transition-delay:.3s}
.workflow-card.is-active{border-color:rgba(0,86,255,.34);background:white;box-shadow:0 34px 76px rgba(0,86,255,.18)}
.workflow-number{position:relative;z-index:1;display:grid;width:64px;height:64px;place-items:center;border-radius:20px;background:linear-gradient(145deg,#0056ff,#43c7ff);color:white;font-family:"Inter",sans-serif;font-size:22px;font-weight:900;box-shadow:0 18px 34px rgba(0,86,255,.26)}
.workflow-number::after{position:absolute;inset:-9px;border:1px solid rgba(0,86,255,.24);border-radius:28px;opacity:0;transform:scale(.82);transition:opacity .2s ease,transform .2s ease;content:""}
.workflow-card.is-active .workflow-number::after{opacity:.44;transform:scale(1)}
.workflow-card h3{margin:0;color:#0f172a;font-size:23px;line-height:1.2;font-weight:900}
.workflow-card p{margin:10px 0 0;color:#64748b;font-size:15px;line-height:1.7;font-weight:750}
.workflow-result{display:inline-flex;width:fit-content;margin-top:16px;border-radius:999px;background:#eef4ff;padding:8px 11px;color:#0056ff;font-size:12px;font-weight:900}
.workflow-card.is-active .workflow-result{background:#0056ff;color:white}
.workflow-showcase.is-visible .workflow-label,.workflow-showcase.is-visible .workflow-actions,.workflow-showcase.is-visible .workflow-card{opacity:1;transform:translateY(0) scale(1)}
.workflow-showcase.is-visible .workflow-title-line{opacity:1;filter:blur(0);transform:translateX(0)}
.workflow-showcase.is-visible .workflow-copy-fragment{opacity:1;filter:blur(0);transform:translateY(0)}
@media (prefers-reduced-motion: reduce){.workflow-label,.workflow-title-line,.workflow-copy-fragment,.workflow-actions,.workflow-card{opacity:1!important;filter:none!important;transform:none!important;transition:none!important}}
@media (max-width: 900px){.workflow-section{min-height:auto;padding-top:clamp(70px,8vw,104px)}.workflow-showcase{position:relative;top:auto;grid-template-columns:1fr;min-height:auto;padding-block:0}.workflow-copy{position:static}.workflow-copy h2{max-width:none}.workflow-copy p{max-width:none}.workflow-board{height:auto;min-height:0;display:grid;gap:14px;border:0;background:transparent;box-shadow:none;overflow:visible}.workflow-board::before,.workflow-board::after{display:none}.workflow-card{position:relative;left:auto;right:auto;top:auto;opacity:1;transform:none}}
@media (max-width: 620px){.workflow-card{grid-template-columns:1fr;padding:20px}.workflow-number{width:48px;height:48px;border-radius:14px}.workflow-actions{display:grid}.workflow-primary,.workflow-secondary{width:100%}}
`;

const processSection = `<section class="section workflow-section" id="guide">
      <div class="workflow-showcase" data-workflow-showcase>
        <div class="workflow-copy">
          <span class="workflow-label">HOW IT WORKS</span>
          <h2>
            <span class="workflow-title-line">전시 부스 준비,</span>
            <span class="workflow-title-line">흐름만 잡으면 쉬워집니다.</span>
          </h2>
          <p>
            <span class="workflow-copy-fragment">전시 일정 선택부터 </span>
            <span class="workflow-copy-fragment">요청서 작성, 견적 비교, 업체 선정까지 </span>
            <span class="workflow-copy-fragment">참여기업이 실제로 진행하는 순서에 맞춰 정리했습니다.</span>
          </p>
          <div class="workflow-actions">
            <a class="workflow-primary" href="/company/quote-requests/new">견적 요청 시작</a>
            <a class="workflow-secondary" href="/exhibitions">전시 일정 보기</a>
          </div>
        </div>
        <div class="workflow-board" aria-label="부스메이트 이용 흐름">
          <article class="workflow-card">
            <span class="workflow-number">01</span>
            <div>
              <h3>전시 일정 선택</h3>
              <p>참가할 전시회를 찾고, 전시장과 일정 정보를 요청서에 자동으로 연결합니다.</p>
              <span class="workflow-result">전시 정보 자동 입력</span>
            </div>
          </article>
          <article class="workflow-card">
            <span class="workflow-number">02</span>
            <div>
              <h3>견적 요청 공개</h3>
              <p>부스 규모, 예산, 희망 콘셉트를 작성하면 검증된 전시업체가 요청을 확인합니다.</p>
              <span class="workflow-result">업체 견적 수신</span>
            </div>
          </article>
          <article class="workflow-card">
            <span class="workflow-number">03</span>
            <div>
              <h3>견적 비교</h3>
              <p>금액, 포함 항목, 제작 기간, 디자인 일정까지 한 화면에서 비교합니다.</p>
              <span class="workflow-result">조건별 비교 가능</span>
            </div>
          </article>
          <article class="workflow-card">
            <span class="workflow-number">04</span>
            <div>
              <h3>업체 선정</h3>
              <p>마음에 드는 견적을 선택하면 요청 상태와 업체 결과가 함께 정리됩니다.</p>
              <span class="workflow-result">선정 결과 확인</span>
            </div>
          </article>
        </div>
      </div>
    </section>`;

const processScript = `
<script>
(() => {
  const workflow = document.querySelector("[data-workflow-showcase]");
  if (!workflow) return;

  const cards = Array.from(workflow.querySelectorAll(".workflow-card"));
  const section = workflow.closest(".workflow-section") || workflow;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const simpleLayout = window.matchMedia("(max-width: 900px)").matches;
  let ticking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hasClass(element, className) {
    return (" " + String(element.className || "") + " ").includes(" " + className + " ");
  }

  function addClass(element, className) {
    if (!hasClass(element, className)) {
      element.className = (String(element.className || "") + " " + className).trim();
    }
  }

  function toggleClass(element, className, enabled) {
    const current = String(element.className || "")
      .split(/\\s+/)
      .filter(Boolean)
      .filter((name) => name !== className);
    if (enabled) current.push(className);
    element.className = current.join(" ");
  }

  function setActive(index) {
    cards.forEach((card, cardIndex) => {
      toggleClass(card, "is-active", cardIndex === index);
    });
  }

  function updateByScroll() {
    ticking = false;

    if (!cards.length) return;

    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const scrollableDistance = Math.max(1, rect.height - viewportHeight);
    const rawProgress = clamp(-rect.top / scrollableDistance, 0, 1);
    const progress = rawProgress < 0.04 ? 0 : rawProgress;

    if (progress > 0.01 || rect.top < viewportHeight * 0.72) {
      addClass(workflow, "is-visible");
    }

    const activePosition = progress * (cards.length - 1);
    const activeIndex = clamp(Math.round(activePosition), 0, cards.length - 1);
    addClass(workflow, "is-visible");
    setActive(activeIndex);

    cards.forEach((card, index) => {
      const signedDistance = index - activePosition;
      const distance = Math.abs(signedDistance);
      const focus = clamp(1 - distance / 1.05, 0, 1);
      const opacity = distance > 2.05 ? 0 : 0.18 + focus * 0.82;
      const y = signedDistance * 168;
      const x = signedDistance * 34;
      const scale = 0.64 + focus * 0.44;
      const rotate = signedDistance * -4.8;

      card.style.opacity = String(opacity);
      card.style.zIndex = String(100 - Math.round(distance * 10));
      card.style.transform =
        "translate3d(" +
        x.toFixed(2) +
        "px, " +
        y.toFixed(2) +
        "px, 0) translateY(-50%) scale(" +
        scale.toFixed(3) +
        ") rotate(" +
        rotate.toFixed(2) +
        "deg)";
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateByScroll);
  }

  if (reducedMotion || simpleLayout) {
    addClass(workflow, "is-visible");
    cards.forEach((card) => {
      card.style.opacity = "1";
      card.style.transform = "none";
      card.style.zIndex = "";
    });
    setActive(0);
  } else {
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", requestUpdate, { once: true });
    requestUpdate();
    window.setTimeout(requestUpdate, 80);
  }
})();
</script>
`;

const calendarScript = `
<script>
(() => {
  const section = document.querySelector("[data-calendar-showcase]");
  if (!section) return;

  const items = Array.from(section.querySelectorAll("[data-calendar-item]"));
  const prevButton = section.querySelector("[data-calendar-prev]");
  const nextButton = section.querySelector("[data-calendar-next]");
  const pageSize = 3;
  let offset = 0;

  function render() {
    items.forEach((item, index) => {
      item.hidden = index < offset || index >= offset + pageSize;
    });
    if (prevButton) prevButton.hidden = offset === 0;
  }

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      offset = Math.max(0, offset - pageSize);
      render();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const nextOffset = offset + pageSize;
      if (nextOffset >= items.length) {
        window.location.href = "/exhibitions";
        return;
      }
      offset = nextOffset;
      render();
    });
  }

  render();
})();
</script>
`;

function buildCalendarSection(exhibitions: Exhibition[]) {
  const items = exhibitions.slice(0, 30);
  const showNextButton = items.length > 3;

  return `<section class="section events-section" id="vendors">
      <div class="calendar-showcase" data-calendar-showcase>
        <div class="events-header">
          <div>
            <h2>다가오는 주요 전시회</h2>
          </div>
          <a class="view-all" href="/exhibitions">전체보기 →</a>
        </div>
        <div class="calendar-board" aria-label="다가오는 주요 전시회 일정">
          <div class="calendar-month">
            <div>
              <em class="calendar-mark">BOOTHMATE</em>
              <strong>${new Date().toLocaleDateString("en-US", { timeZone: "Asia/Seoul", year: "numeric" })}</strong>
              <span>다가오는 전시회</span>
            </div>
          </div>
          <div class="calendar-list-wrap">
            ${
              showNextButton
                ? `<button class="calendar-nav calendar-prev" type="button" data-calendar-prev data-arrow="‹" aria-label="이전 전시회 보기" hidden></button>
            <button class="calendar-nav calendar-next" type="button" data-calendar-next data-arrow="›" aria-label="다음 전시회 보기"></button>`
                : `<a class="calendar-nav calendar-next" href="/exhibitions" data-arrow="›" aria-label="전시 일정 페이지로 이동"></a>`
            }
            <div class="calendar-list">
            ${
              items.length
                ? items.map((item, index) => renderCalendarItem(item, index)).join("")
                : `<a class="calendar-item" href="/exhibitions">
              <time class="calendar-date"><b>--</b><span>NOW</span></time>
              <div class="calendar-copy">
                <h3>표시할 전시 일정이 없습니다.</h3>
                <p>전시 일정 페이지에서 필터를 조정해 확인해주세요.</p>
              </div>
              <span class="calendar-chip">일정 확인</span>
            </a>`
            }
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderCalendarItem(exhibition: Exhibition, index: number) {
  const start = parseDateParts(exhibition.start_date);
  const homepageUrl = normalizeHomepageUrl(exhibition.homepage_url);
  const linkAttributes = homepageUrl
    ? `href="${escapeHtml(homepageUrl)}" target="_blank" rel="noopener noreferrer"`
    : `href="/exhibitions"`;
  const venue = [exhibition.venue_group, exhibition.venue].filter(Boolean).join(" · ") || "장소 미정";
  const hidden = index >= 3 ? " hidden" : "";

  return `<a class="calendar-item" data-calendar-item data-index="${index}"${hidden} ${linkAttributes}>
              <time class="calendar-date" datetime="${escapeHtml(exhibition.start_date ?? "")}"><b>${start.day}</b><span>${start.month}</span></time>
              <div class="calendar-copy">
                <h3>${escapeHtml(exhibition.title)}</h3>
                <p>${escapeHtml(formatDateRange(exhibition.start_date, exhibition.end_date))} · ${escapeHtml(venue)}</p>
              </div>
              <span class="calendar-dday">${getStartDday(exhibition.start_date)}</span>
            </a>`;
}

function normalizeHomepageUrl(value: string | null) {
  if (!value) return "";
  const first = value
    .split(/\s+\/\s+|,\s*|\n/)
    .map((item) => item.trim())
    .find(Boolean);
  if (!first) return "";

  const normalized = /^https?:\/\//i.test(first) ? first : `https://${first}`;
  try {
    const url = new URL(normalized);
    return url.href;
  } catch {
    return "";
  }
}

function getStartDday(startDate: string | null) {
  const diff = getStartDayDiff(startDate);
  if (!Number.isFinite(diff)) return "일정 미정";
  if (diff > 0) return `DAY-${diff}`;
  return "일정 제외";
}

function getStartDayDiff(startDate: string | null) {
  if (!startDate) return Number.NaN;
  const today = parseDateOnly(getTodayIsoDate());
  const start = parseDateOnly(startDate);
  if (!today || !start) return Number.NaN;
  return Math.ceil((start.getTime() - today.getTime()) / 86400000);
}

function getTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function parseDateOnly(date: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseDateParts(date: string | null) {
  if (!date) return { day: "--", month: "TBD" };
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { day: "--", month: "TBD" };
  return {
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "Asia/Seoul" }).format(parsed),
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "Asia/Seoul" }).format(parsed).toUpperCase()
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rewriteLegacyHtml(html: string, calendarSection: string) {
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
    .replaceAll("EXHIBIT BETTER · 부스메이트 ·", "EXHIBIT BETTER · BOOTHMATE ·")
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
    /<section class="section process-section" id="guide">[\s\S]*?<\/section>/,
    processSection
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
    /<section class="section events-section" id="vendors">[\s\S]*?<\/section>/,
    calendarSection
  );
  rewritten = rewritten.replace(
    /<footer class="footer" id="schedule">[\s\S]*?<\/footer>/,
    `<footer class="landing-footer" id="schedule">
      <div class="landing-footer-inner">
        <div class="landing-footer-brand">
          <img src="/logo.svg" alt="부스메이트" />
          <p>투명하고 효율적인 전시 부스 매칭 플랫폼</p>
        </div>
        <p class="landing-footer-code">BOOTHMATE</p>
      </div>
    </footer>`
  );
  rewritten = rewritten.replace(
    "</style>",
    `${calendarStyles}${processStyles}.page{overflow:visible!important}.nav-links{display:none!important}.nav{grid-template-columns:auto auto}.nav-actions{margin-left:auto}</style>`
  );
  rewritten = rewritten.replace("</body>", `${processScript}${calendarScript}</body>`);

  return rewritten;
}

export async function GET(request: Request) {
  const context = await getCurrentUserContext().catch(() => null);

  if (context) {
    return NextResponse.redirect(new URL(getDashboardPath(context.profile.role), request.url));
  }

  const htmlPath = path.join(process.cwd(), "legacy-static", "index.html");
  const html = await readFile(htmlPath, "utf8");
  const exhibitions = await listExhibitions({ sort: "dateAsc", status: "upcoming", pageSize: 30 })
    .then((items) => items.filter((item) => getStartDayDiff(item.start_date) > 0).slice(0, 30))
    .catch(() => []);

  return new Response(rewriteLegacyHtml(html, buildCalendarSection(exhibitions)), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
