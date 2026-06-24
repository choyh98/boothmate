(function () {
  const config = window.ILV_CONFIG || {};
  let clientPromise;

  function isConfigured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (window.supabase) resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (!isConfigured()) return null;
    if (!clientPromise) {
      clientPromise = loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2").then(() => {
        return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      });
    }
    return clientPromise;
  }

  function ok(skipped = false) {
    return { ok: true, skipped };
  }

  async function login({ email, password }) {
    const client = await getClient();
    if (!client) return ok(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return ok();
  }

  async function signup(payload) {
    const client = await getClient();
    if (!client) return ok(true);

    const { email, password, role, profile } = payload;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { role, ...profile } },
    });
    if (error) throw error;

    const userId = data.user && data.user.id;
    if (userId) {
      await client.from("profiles").upsert({
        id: userId,
        role,
        company_name: profile.companyName,
        manager_name: profile.managerName,
        phone: profile.phone,
        specialty: profile.specialty,
      });
    }

    return ok();
  }

  async function saveQuoteRequest(payload) {
    const client = await getClient();
    if (!client) return ok(true);

    const { data: auth } = await client.auth.getUser();
    const { error } = await client.from("quote_requests").insert({
      user_id: auth.user ? auth.user.id : null,
      status: "submitted",
      event_name: payload.event,
      venue: payload.venue,
      event_dates: payload.dates,
      industry: payload.industry,
      booth_count: payload.boothCount,
      area: payload.area,
      booth_width: payload.width,
      booth_depth: payload.depth,
      booth_number: payload.boothNumber,
      open_side: payload.openSide,
      booth_types: payload.types,
      budget_range: payload.budget,
      min_budget: payload.minBudget,
      max_budget: payload.maxBudget,
      vat: payload.vat,
      facilities: payload.facilities,
      design_styles: payload.styles,
      request_text: payload.request,
      files: payload.files,
      deadline: payload.deadline,
    });
    if (error) throw error;
    return ok();
  }

  window.ILV_SUPABASE = {
    isConfigured,
    login,
    signup,
    saveQuoteRequest,
  };
})();
