(function () {
  const PAGE_SIZE = 12;
  const IMAGE = "assets/ilv-booth-hero.png";
  let events = [];
  let page = 1;
  let sortMode = "deadline";
  let viewMode = "cards";

  const grid = () => document.querySelector(".event-grid");
  const countEl = () => document.querySelector(".results-count");
  const searchEl = () => document.querySelector("#eventSearch");
  const paginationEl = () => document.querySelector(".pagination");
  const venueTabs = () => document.querySelectorAll(".tab-button");
  const sortButtons = () => document.querySelectorAll("[data-sort]");
  const viewButtons = () => document.querySelectorAll("[data-view]");

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(String(value).replace(/[.]/g, "-"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function daysUntil(startDate) {
    const start = parseDate(startDate);
    if (!start) return 99999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((start - today) / 86400000);
  }

  function dday(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start) return "D-?";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end && today > end) return "종료";
    if (today >= start && (!end || today <= end)) return "진행중";

    const diff = daysUntil(startDate);
    return diff >= 0 ? `D-${diff}` : "종료";
  }

  function statusOf(event) {
    const label = dday(event.startDate, event.endDate);
    if (label === "진행중") return "진행중";
    if (label === "종료") return "종료";
    return "신청 가능";
  }

  function activeVenue() {
    const tab = document.querySelector(".tab-button.is-active");
    return tab ? tab.textContent.trim() : "전체";
  }

  function filteredEvents() {
    const query = (searchEl()?.value || "").trim().toLowerCase();
    const venue = activeVenue();

    const list = events.filter((event) => {
      const text = `${event.title} ${event.subtitle} ${event.venueGroup} ${event.venue} ${event.category} ${event.rawCategory}`.toLowerCase();
      const matchesQuery = !query || text.includes(query);
      const matchesVenue = venue === "전체" || event.venueGroup === venue;
      return matchesQuery && matchesVenue;
    });

    return sortEvents(list);
  }

  function sortEvents(list) {
    const copy = [...list];
    if (sortMode === "dateAsc") {
      copy.sort((a, b) => (parseDate(a.startDate) || 0) - (parseDate(b.startDate) || 0));
      return copy;
    }
    if (sortMode === "dateDesc") {
      copy.sort((a, b) => (parseDate(b.startDate) || 0) - (parseDate(a.startDate) || 0));
      return copy;
    }
    if (sortMode === "name") {
      copy.sort((a, b) => String(a.title).localeCompare(String(b.title), "ko"));
      return copy;
    }
    copy.sort((a, b) => {
      const ad = daysUntil(a.startDate);
      const bd = daysUntil(b.startDate);
      const aPast = ad < 0;
      const bPast = bd < 0;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return ad - bd;
    });
    return copy;
  }

  function card(event) {
    const label = dday(event.startDate, event.endDate);
    const period = event.period || [event.startDate, event.endDate].filter(Boolean).join(" ~ ");
    const venue = [event.venueGroup, event.venue].filter(Boolean).join(" · ");

    return `
      <article class="event-card" data-source="${escapeHtml(event.venueGroup)}">
        <div class="event-image">
          <img src="${IMAGE}" alt="${escapeHtml(event.title)}" />
          <span class="d-day">${escapeHtml(label)}</span>
          <button class="favorite" type="button" aria-label="관심 전시회">♡</button>
        </div>
        <div class="event-info">
          <span class="category">${escapeHtml(event.category)}</span>
          <h3>${escapeHtml(event.title)}</h3>
          <div class="meta">
            <span>일정 ${escapeHtml(period)}</span>
            <span>장소 ${escapeHtml(venue)}</span>
            <span>상태 ${escapeHtml(statusOf(event))}</span>
          </div>
          <div class="event-actions">
            <a href="event-detail.html">상세보기</a>
            <a href="quote.html">견적요청</a>
          </div>
        </div>
      </article>
    `;
  }

  function monthKey(event) {
    const date = parseDate(event.startDate);
    if (!date) return "일정 미정";
    return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`;
  }

  function calendarTemplate(list) {
    const grouped = new Map();
    list.forEach((event) => {
      const key = monthKey(event);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(event);
    });

    return [...grouped.entries()].map(([month, items]) => `
      <section class="calendar-month">
        <h3>${escapeHtml(month)}</h3>
        <div class="calendar-list">
          ${items.map((event) => `
            <article class="calendar-event">
              <div class="calendar-date">
                <strong>${escapeHtml((event.startDate || "").slice(8, 10) || "?")}</strong>
                <span>${escapeHtml(dday(event.startDate, event.endDate))}</span>
              </div>
              <div>
                <span class="category">${escapeHtml(event.venueGroup)}</span>
                <h4>${escapeHtml(event.title)}</h4>
                <p>${escapeHtml(event.period || "")} · ${escapeHtml(event.venue || "장소 미정")}</p>
              </div>
              <a href="quote.html">견적요청</a>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function renderPagination(total) {
    const el = paginationEl();
    if (!el) return;
    if (viewMode === "calendar") {
      el.innerHTML = "";
      return;
    }

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const buttons = [];
    buttons.push(`<button type="button" data-page="${Math.max(1, page - 1)}">‹</button>`);
    for (let i = 1; i <= Math.min(pages, 5); i += 1) {
      buttons.push(`<button class="${i === page ? "is-active" : ""}" type="button" data-page="${i}">${i}</button>`);
    }
    buttons.push(`<button type="button" data-page="${Math.min(pages, page + 1)}">›</button>`);
    el.innerHTML = buttons.join("");
    el.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        page = Number(button.dataset.page);
        render();
      });
    });
  }

  function bindCards() {
    document.querySelectorAll(".favorite").forEach((button) => {
      button.addEventListener("click", () => {
        button.classList.toggle("is-active");
        button.textContent = button.classList.contains("is-active") ? "♥" : "♡";
      });
    });

    document.querySelectorAll(".event-card").forEach((cardEl) => {
      cardEl.addEventListener("pointermove", (event) => {
        const rect = cardEl.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        cardEl.style.transform = `translateY(-8px) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
      });
      cardEl.addEventListener("pointerleave", () => {
        cardEl.style.transform = "";
      });
    });
  }

  function render() {
    const list = filteredEvents();
    const target = grid();
    if (!target) return;

    target.classList.toggle("is-calendar", viewMode === "calendar");

    if (viewMode === "calendar") {
      target.innerHTML = calendarTemplate(list);
    } else {
      const start = (page - 1) * PAGE_SIZE;
      const current = list.slice(start, start + PAGE_SIZE);
      target.innerHTML = current.map(card).join("");
      bindCards();
    }

    if (countEl()) countEl().innerHTML = `총 <b>${list.length}개</b> 전시회`;
    renderPagination(list.length);
  }

  function resetControls() {
    if (searchEl()) searchEl().value = "";
    venueTabs().forEach((button) => button.classList.toggle("is-active", button.textContent.trim() === "전체"));
    sortMode = "deadline";
    viewMode = "cards";
    sortButtons().forEach((button) => button.classList.toggle("is-active", button.dataset.sort === sortMode));
    viewButtons().forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewMode));
    page = 1;
    render();
  }

  function resetAndRender() {
    page = 1;
    render();
  }

  async function init() {
    try {
      const response = await fetch("assets/exhibitions-2026.json", { cache: "no-store" });
      if (!response.ok) throw new Error("일정 데이터 파일을 불러오지 못했습니다.");
      events = await response.json();
      if (!Array.isArray(events) || !events.length) return;

      searchEl()?.addEventListener("input", resetAndRender);
      venueTabs().forEach((button) => {
        button.addEventListener("click", () => window.setTimeout(resetAndRender, 0));
      });
      sortButtons().forEach((button) => {
        button.addEventListener("click", () => {
          sortButtons().forEach((item) => item.classList.remove("is-active"));
          button.classList.add("is-active");
          sortMode = button.dataset.sort;
          resetAndRender();
        });
      });
      viewButtons().forEach((button) => {
        button.addEventListener("click", () => {
          viewButtons().forEach((item) => item.classList.remove("is-active"));
          button.classList.add("is-active");
          viewMode = button.dataset.view;
          resetAndRender();
        });
      });
      document.querySelector(".reset")?.addEventListener("click", resetControls);

      render();
    } catch (error) {
      console.warn("[ILV] local schedule fallback:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
