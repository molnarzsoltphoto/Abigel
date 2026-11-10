/* === TERMÉKFEJLESZTÉS MODUL (Product Lab 2) ===
   A korábbi, csak részben bekötött Product Lab helyett: egységes adatmodell, döntési kapuk,
   forrásolt validáció, számszerű üzleti eset, pilot-mérési terv, portfólió, benchmark forrással,
   verziózott előterjesztés, szöveges tudásbázis a promptokban. A meglévő projekteket átveszi. */
(() => {
  "use strict";
  const LC = ["ÖTLET", "FELTÁRÁS", "KONCEPCIÓ", "ÜZLETI ESET", "FEJLESZTÉS", "PILOT", "BEVEZETÉS", "NÖVEKEDÉS", "OPTIMALIZÁLÁS", "ÉRETTSÉG", "KIVEZETÉS"];
  const STAGES = ["UTAZÁSI IGÉNY", "INFORMÁCIÓKERESÉS", "TERVEZÉS", "VÁSÁRLÁS", "ÁLLOMÁS", "VÁRAKOZÁS", "FELSZÁLLÁS", "FEDÉLZET", "ÁTSZÁLLÁS", "ÉRKEZÉS", "CÉLÁLLOMÁS", "UTÓÉLMÉNY"];
  const VTYPES = ["TÉNY", "FELTÉTELEZÉS", "HIPOTÉZIS", "BECSLÉS"];
  const RISKS = ["magas", "közepes", "alacsony"];
  const VSTAT = ["nyitott", "igazolt", "elvetett"];
  const OLD_PHASE = { Ötlet: "ÖTLET", Kutatás: "FELTÁRÁS", Koncepció: "KONCEPCIÓ", Tervezés: "ÜZLETI ESET", Fejlesztés: "FEJLESZTÉS", Tesztelés: "PILOT", Bevezetés: "BEVEZETÉS", Értékelés: "NÖVEKEDÉS" };
  // panasz-kulcsszavak a lánc szakaszaihoz (játék a szavakkal, nem hiteles taxonómia; a CSV-ben lévő „szakasz” oszlop felülírja)
  const STAGE_KEYS = {
    "INFORMÁCIÓKERESÉS": ["információ", "tájékoztat", "honlap", "menetrend", "applikáció", "alkalmazás", "elvira", "telefon", "ügyfélszolg", "weboldal"],
    "TERVEZÉS": ["útvonal", "tervez", "foglal"],
    "VÁSÁRLÁS": ["jegy", "pénztár", "automata", "bérlet", "jegyár", "árak", "drága", "díj", "kedvezmény", "visszatérít", "fizet", "bankkárty", "számla"],
    "ÁLLOMÁS": ["állomás", "peron", "lift", "mozgólépcső", "váró", "wc", "parkol", "akadálymentes", "kijelző", "hangos", "megálló"],
    "VÁRAKOZÁS": ["kés", "várakoz", "kimarad", "törölt", "törlés", "pótló"],
    "FELSZÁLLÁS": ["felszáll", "beszáll", "kerékpár", "babakocsi", "ajtó", "lépcső", "zsúfolt", "tömeg", "nem fért"],
    "FEDÉLZET": ["ülés", "ülőhely", "klíma", "fűtés", "tiszta", "mosdó", "wc", "wifi", "konnektor", "kalauz", "jegyvizsgáló", "étkező", "büfé", "zaj", "ablak", "fedélzet", "vonaton", "kocsi"],
    "ÁTSZÁLLÁS": ["átszáll", "csatlakoz", "lekés"],
    "ÉRKEZÉS": ["érkez", "célállomás"],
    "UTÓÉLMÉNY": ["panasz", "kártérítés", "válasz", "ügyintéz", "talált tárgy", "elveszett"],
  };
  const hasKey = (txt, k) => new RegExp("(^|[^a-záéíóöőúüű])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(txt);

  const S = () => STATE;
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const num = (v) => (v === "" || v == null || isNaN(+v) ? 0 : +v);
  const fmtN = (v, d = 0) => (v == null || isNaN(v) ? "–" : Number(v).toLocaleString("hu-HU", { maximumFractionDigits: d, minimumFractionDigits: d }));
  const today = () => new Date().toISOString().slice(0, 10);
  const days = (iso) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : null);
  const E = (v) => (typeof esc === "function" ? esc(v ?? "") : String(v ?? ""));

  // ── migráció: mindkét korábbi projektalak → egységes ──
  function migrate(p) {
    if (!p || p._v2) return p;
    p.id ||= uid("p");
    p.name ||= "Névtelen projekt";
    p.owner ||= "";
    p.desc ||= p.problem?.statement || "";
    p.lifecycle = LC.includes(p.lifecycle) ? p.lifecycle : OLD_PHASE[p.phase] || "ÖTLET";
    p.problem = Object.assign({ statement: p.desc || "", affectedWho: "", region: "", currentSolution: "", whyNeeded: "", goal: "", deadline: "", orgsInvolved: "" }, p.problem || {});
    const vt = { teny: "TÉNY", feltetelezes: "FELTÉTELEZÉS", hipotezis: "HIPOTÉZIS", becsles: "BECSLÉS", javaslat: "HIPOTÉZIS" };
    const old = [...(p.validation || []), ...(p.insights || [])];
    p.validation = old.map((v) => ({
      id: v.id || uid("v"), type: VTYPES.includes(v.type) ? v.type : vt[v.type] || "FELTÉTELEZÉS", text: v.text || "", source: v.source || "",
      verifiedBy: v.verifiedBy || "", verifiedAt: v.verifiedAt || "", ifFalse: v.ifFalse || "", risk: v.risk || "közepes", status: v.status || (v.type === "TÉNY" || v.type === "teny" ? "igazolt" : "nyitott"),
    }));
    delete p.insights;
    p.segments = (p.segments || []).map((s) => ({ id: s.id || uid("s"), name: s.name || "", need: s.need || s.needs || "", pain: s.pain || s.painPoints || "", size: s.size || "" }));
    p.journey = STAGES.map((st, i) => Object.assign({ stage: st, painPoint: "", severity: "", opportunity: "", kpi: "", complaints: 0 }, (p.journey || [])[i] && (p.journey[i].stage === st ? p.journey[i] : {})));
    p.complaints ||= null;
    const ob = p.bizcase || {}, rb = p.businessCase || {};
    p.bizcase = {
      background: ob.background || rb.background?.text || "", proposal: ob.proposal || rb.proposedSolution?.text || "", alternatives: ob.alternatives || rb.alternatives?.text || "",
      risks: ob.risks || rb.risks?.text || "", notes: ob.notes || [ob.revenue && "Bevétel (régi): " + ob.revenue, ob.cost && "Költség (régi): " + ob.cost, ob.roi && "Megtérülés (régi): " + ob.roi].filter(Boolean).join("\n"),
      tekno: ob.tekno || {},
      model: Object.assign({ capex: 0, opexYear: 0, paxYear: 0, revPerPax: 0, savingYear: 0, horizon: 5, discount: 5, rampUp: 60 }, ob.model || {}),
    };
    delete p.businessCase;
    p.pilot = Object.assign({ hypothesis: "", metric: "", baseline: "", effect: "", control: "", duration: "", location: "", period: "", success: "", stop: "", decisionDate: "", decider: "", outcome: "", sampleBaselinePct: "", sampleEffectPp: "" }, p.pilot || {});
    p.kpis = (p.kpis || []).map((k) => ({ id: k.id || uid("k"), name: k.name || "", unit: k.unit || "", target: k.target ?? "", current: k.current ?? k.actual ?? "", category: k.category || "" }));
    p.partners = (p.partners || []).map((x) => ({ id: x.id || uid("pt"), name: x.name || "", contact: x.contact || "", status: x.status || "potencial", note: x.note || x.type || "" }));
    p.benchmarks ||= [];
    p.proposals ||= [];
    p.gateLog ||= [{ from: null, to: p.lifecycle, at: p.createdAt || new Date().toISOString(), by: "", note: "migrált állapot" }];
    p.priority = Object.assign({ impact: 5, effort: 5 }, p.priority || {});
    p.createdAt ||= new Date().toISOString();
    p._v2 = 2;
    return p;
  }
  function migrateAll() {
    S().projects ||= [];
    S().projects.forEach(migrate);
    S().kb2 ||= [];
    if (!S().currentProjectId && S().projects.length) S().currentProjectId = S().projects[0].id;
  }
  const cur = () => {
    migrateAll();
    return S().projects.find((p) => p.id === S().currentProjectId) || S().projects[0] || null;
  };
  // azonnal helyben, Firebase-be késleltetve (ne minden billentyűre menjen hálózati írás)
  let saveTimer = null;
  const persist = () => {
    try { localStorage.setItem("abigel_state", JSON.stringify(STATE)); } catch (_) {}
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { save(); } catch (_) {} }, 1500);
  };

  // ── kapuk ──
  const GATES = {
    FELTÁRÁS: (p) => [[!!p.problem.statement, "problémameghatározás"], [!!p.problem.affectedWho, "érintett utas megnevezve"]],
    KONCEPCIÓ: (p) => [[p.segments.length >= 1, "legalább egy célcsoport"], [p.validation.length >= 2, "legalább két validációs tétel"], [p.validation.some((v) => v.type === "TÉNY" && v.source), "legalább egy forrásolt tény"]],
    "ÜZLETI ESET": (p) => [[p.kpis.length >= 1, "legalább egy KPI"], [p.journey.some((j) => j.painPoint && j.severity), "utazási láncban súlyozott fájdalompont"], [!p.validation.some((v) => v.risk === "magas" && v.status === "nyitott" && v.type !== "TÉNY"), "nincs nyitott magas kockázatú feltételezés (igazold, vesd el, vagy tedd pilot-hipotézissé)"]],
    FEJLESZTÉS: (p) => {
      const m = p.bizcase.model, r = calcBiz(p);
      return [[m.capex > 0, "egyszeri költség megadva"], [m.paxYear * m.revPerPax + m.savingYear > 0, "bevételi vagy megtakarítási hatás megadva"], [!!p.bizcase.risks, "kockázatok leírva"], [r.npv != null, "NPV számítható"]];
    },
    PILOT: (p) => [[!!p.pilot.hypothesis, "pilot hipotézis"], [!!p.pilot.metric, "mért mutató"], [!!p.pilot.success, "sikerküszöb"], [!!p.pilot.stop, "leállítási küszöb"], [!!p.pilot.decisionDate, "döntési dátum"]],
    BEVEZETÉS: (p) => [[!!p.pilot.outcome, "pilot eredménye rögzítve"], [!!p.pilot.decider, "pilot döntéshozó megnevezve"]],
  };
  function gateCheck(p, to) {
    const g = GATES[to];
    if (!g) return { ok: true, missing: [] };
    const res = g(p);
    return { ok: res.every((r) => r[0]), missing: res.filter((r) => !r[0]).map((r) => r[1]) };
  }
  function nextPhase(p) {
    const i = LC.indexOf(p.lifecycle);
    return i >= 0 && i < LC.length - 1 ? LC[i + 1] : null;
  }
  function waitingSince(p) {
    const last = p.gateLog.at(-1);
    return days(last?.at);
  }

  // ── érettség: döntési érettség, nem kitöltöttség ──
  function maturity(p) {
    const items = p.validation, facts = items.filter((v) => v.type === "TÉNY");
    const sourced = facts.filter((v) => v.source).length;
    const high = items.filter((v) => v.risk === "magas" && v.type !== "TÉNY"), highDone = high.filter((v) => v.status !== "nyitott").length;
    const gatesPassed = Math.max(0, LC.indexOf(p.lifecycle));
    const a = items.length ? sourced / Math.max(1, facts.length) : 0;
    const b = high.length ? highDone / high.length : items.length ? 1 : 0;
    const c = gatesPassed / 6; // a döntési szakaszok (ÖTLET→BEVEZETÉS) számítanak
    const pct = Math.round(100 * (0.3 * a + 0.4 * b + 0.3 * Math.min(1, c)));
    const missing = [];
    if (!facts.length) missing.push("nincs TÉNY a validációban");
    if (facts.length && sourced < facts.length) missing.push(`${facts.length - sourced} tény forrás nélkül`);
    if (high.length && highDone < high.length) missing.push(`${high.length - highDone} nyitott magas kockázatú feltételezés`);
    const nx = nextPhase(p);
    if (nx) missing.push(...gateCheck(p, nx).missing.map((m) => `kapu (${nx}): ${m}`));
    return { pct, missing };
  }

  // ── üzleti eset számítás ──
  function calcBiz(p) {
    const m = p.bizcase.model, H = Math.max(1, Math.round(num(m.horizon))), r = num(m.discount) / 100;
    const benefitFull = num(m.paxYear) * num(m.revPerPax) + num(m.savingYear);
    if (!num(m.capex) && !benefitFull) return { npv: null, payback: null, rows: [], benefitFull };
    let npv = -num(m.capex), cum = -num(m.capex), payback = null;
    const rows = [];
    for (let t = 1; t <= H; t++) {
      const ramp = t === 1 ? Math.min(1, Math.max(0, num(m.rampUp) / 100)) : 1;
      const benefit = benefitFull * ramp, net = benefit - num(m.opexYear), disc = net / Math.pow(1 + r, t);
      npv += disc;
      cum += net;
      if (payback == null && cum >= 0) payback = t - (net ? cum / net : 0);
      rows.push({ t, benefit, opex: num(m.opexYear), net, disc, cum });
    }
    return { npv, payback, rows, benefitFull };
  }
  function sensitivity(p) {
    const base = calcBiz(p).npv, m = p.bizcase.model, out = [];
    const vary = (key, label) => {
      for (const f of [0.8, 1.2]) {
        const save = m[key];
        m[key] = num(save) * f;
        out.push({ label, f, npv: calcBiz(p).npv });
        m[key] = save;
      }
    };
    vary("capex", "egyszeri költség");
    vary("paxYear", "érintett utas/év");
    vary("revPerPax", "bevétel/utas");
    vary("savingYear", "megtakarítás/év");
    return { base, out: out.filter((o) => o.npv != null) };
  }

  // ── pilot mintanagyság (arány típusú mutatóra) ──
  function sampleSize(p0pct, effPp) {
    const p0 = num(p0pct) / 100, d = num(effPp) / 100;
    if (!p0 || !d) return null;
    const p1 = Math.min(0.999, Math.max(0.001, p0 - d)), z = 1.96, zb = 0.84, pbar = (p0 + p1) / 2;
    const n = Math.pow(z * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1)), 2) / Math.pow(p0 - p1, 2);
    return Math.ceil(n);
  }

  // ── panasz-CSV ──
  function parseCSV(text) {
    const rows = [], sep = (text.split("\n")[0].match(/;/g) || []).length >= (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  function importComplaints(p, text) {
    const rows = parseCSV(text);
    if (rows.length < 2) return { ok: false, msg: "Üres vagy egysoros CSV." };
    const head = rows[0].map((h) => h.toLowerCase());
    const stageCol = head.findIndex((h) => /szakasz|stage|lánc/.test(h)), catCol = head.findIndex((h) => /kateg|téma|tema|típus|tipus/.test(h));
    const textCols = head.map((h, i) => (/szöveg|szoveg|leírás|leiras|panasz|tárgy|targy|megjegyz/.test(h) ? i : -1)).filter((i) => i >= 0);
    const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])), byCat = {};
    let unmatched = 0;
    for (const r of rows.slice(1)) {
      let st = null;
      if (stageCol >= 0) st = STAGES.find((s) => (r[stageCol] || "").toUpperCase().includes(s.split(" ")[0]));
      if (!st) {
        const txt = (textCols.length ? textCols.map((i) => r[i]).join(" ") : r.join(" ")).toLowerCase();
        let best = null, bestN = 0;
        for (const [s, keys] of Object.entries(STAGE_KEYS)) {
          const n = keys.filter((k) => hasKey(txt, k)).length;
          if (n > bestN) { bestN = n; best = s; }
        }
        st = best;
      }
      if (st) byStage[st]++; else unmatched++;
      if (catCol >= 0) { const c = (r[catCol] || "egyéb").trim(); byCat[c] = (byCat[c] || 0) + 1; }
    }
    const total = rows.length - 1;
    p.complaints = { importedAt: new Date().toISOString(), total, unmatched, byStage, topCats: Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8), stageColumn: stageCol >= 0 };
    p.journey.forEach((j) => (j.complaints = byStage[j.stage] || 0));
    return { ok: true, msg: `${total} sor feldolgozva, ${unmatched} nem besorolható.` };
  }

  // ── AI (termékfejlesztői persona, nem a kommunikációs callAI) ──
  function kbContext(p) {
    const docs = S().kb2 || [];
    if (!docs.length) return "";
    const words = (p.name + " " + p.problem.statement + " " + p.problem.goal).toLowerCase().split(/[^a-záéíóöőúüű0-9]+/).filter((w) => w.length > 4);
    const scored = docs.map((d) => ({ d, s: words.reduce((a, w) => a + ((d.text || "").toLowerCase().includes(w) ? 1 : 0), 0) + (d.pinned ? 100 : 0) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
    if (!scored.length) return "";
    return "\n\nBELSŐ TUDÁSBÁZIS (erre hivatkozz, ha releváns, a dokumentum címével):\n" + scored.map(({ d }) => `### ${d.title} (${d.cat})\n${(d.text || "").slice(0, 1800)}`).join("\n\n");
  }
  function ctx(p) {
    const v = p.validation;
    const list = (arr) => (arr.length ? arr.map((x) => `- ${x.text}${x.source ? " [forrás: " + x.source + "]" : ""}`).join("\n") : "- (nincs)");
    const r = calcBiz(p), m = p.bizcase.model;
    return [
      `Projekt: ${p.name} · fázis: ${p.lifecycle} · felelős: ${p.owner || "n.a."}`,
      `Probléma: ${p.problem.statement}\nÉrintett: ${p.problem.affectedWho}\nTérség: ${p.problem.region}\nJelenlegi megoldás: ${p.problem.currentSolution}\nCél: ${p.problem.goal}\nHatáridő: ${p.problem.deadline}`,
      `TÉNYEK:\n${list(v.filter((x) => x.type === "TÉNY"))}`,
      `FELTÉTELEZÉSEK / HIPOTÉZISEK / BECSLÉSEK (nem igazolt!):\n${list(v.filter((x) => x.type !== "TÉNY")).replace(/^- /gm, "- ") }`,
      `Célcsoportok: ${p.segments.map((s) => `${s.name} (igény: ${s.need}; fájdalom: ${s.pain})`).join("; ") || "n.a."}`,
      `Utazási lánc fájdalompontok: ${p.journey.filter((j) => j.painPoint).map((j) => `${j.stage}: ${j.painPoint} (${j.severity}${j.complaints ? ", " + j.complaints + " panasz" : ""})`).join("; ") || "n.a."}`,
      `Üzleti eset: egyszeri ${fmtN(m.capex)} Ft, éves működési ${fmtN(m.opexYear)} Ft, ${fmtN(m.paxYear)} utas/év × ${fmtN(m.revPerPax)} Ft + ${fmtN(m.savingYear)} Ft megtakarítás/év, ${m.horizon} év, ${m.discount}% diszkont → NPV ${r.npv == null ? "n.a." : fmtN(r.npv) + " Ft"}, megtérülés ${r.payback == null ? "n.a." : fmtN(r.payback, 1) + " év"}. Háttér: ${p.bizcase.background}. Javaslat: ${p.bizcase.proposal}. Alternatívák: ${p.bizcase.alternatives}. Kockázatok: ${p.bizcase.risks}`,
      `KPI-k: ${p.kpis.map((k) => `${k.name}: cél ${k.target} ${k.unit}, tény ${k.current || "n.a."}`).join("; ") || "n.a."}`,
      `Pilot: ${p.pilot.hypothesis} · mutató: ${p.pilot.metric} · bázis: ${p.pilot.baseline} · várt hatás: ${p.pilot.effect} · kontroll: ${p.pilot.control} · siker: ${p.pilot.success} · leállítás: ${p.pilot.stop} · döntés: ${p.pilot.decisionDate} (${p.pilot.decider})`,
      `Benchmark: ${p.benchmarks.map((b) => `${b.org}: ${b.solution} [${b.type}${b.source ? ", " + b.source : ""}]`).join("; ") || "n.a."}`,
    ].join("\n\n") + kbContext(p);
  }
  const SYSTEM = "Te egy tapasztalt vasúti termékfejlesztési és szolgáltatástervezési szakértő vagy egy magyar vasúttársaságnál. Döntés-előkészítő anyagokat írsz vezetőknek. Szabályok: csak a megadott adatokra építs; ami a forrásban TÉNY, azt tényként kezeld, ami feltételezés, hipotézis vagy becslés, azt mindig jelöld így; ha adat hiányzik, írd: „nincs adat”, ne találj ki számot. Tömör, magyar, vezetői nyelvezet. Ne használj bürokrata fordulatokat.";
  async function ai(prompt, maxTokens = 2500, system = SYSTEM) {
    if (typeof AKEY === "undefined" || !AKEY) throw new Error("Nincs API kulcs (Beállítások).");
    const r = await fetch(AURL, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": AKEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: MDL, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) { let m = "API hiba " + r.status; try { m += ": " + (await r.json()).error?.message; } catch (_) {} throw new Error(m); }
    const d = await r.json();
    return (d.content || []).map((b) => b.text || "").join("");
  }

  // ── UI segédek ──
  const inp = (path, val, ph = "", type = "text", extra = "") => `<input type="${type}" value="${E(val)}" placeholder="${E(ph)}" oninput="PL2.set('${path}',this.value)" ${extra}>`;
  const ta = (path, val, rows = 3, ph = "") => `<textarea rows="${rows}" placeholder="${E(ph)}" oninput="PL2.set('${path}',this.value)">${E(val)}</textarea>`;
  const sel = (path, val, opts) => `<select onchange="PL2.set('${path}',this.value)">${opts.map((o) => `<option value="${E(o)}"${o === val ? " selected" : ""}>${E(o)}</option>`).join("")}</select>`;
  const row = (label, control) => `<div class="pl-form-row"><label>${label}</label>${control}</div>`;
  const pill = (txt, cls = "info") => `<span class="pl-pill ${cls}">${E(txt)}</span>`;
  const typeCls = { "TÉNY": "good", "FELTÉTELEZÉS": "warn", "HIPOTÉZIS": "info", "BECSLÉS": "warn" };
  const riskCls = { magas: "bad", "közepes": "warn", alacsony: "good" };
  const TABS = ["Portfólió", "Projekt", "Validáció", "Utazási lánc", "Üzleti eset", "Pilot", "KPI", "Benchmark", "Előterjesztés", "Partnerek", "Tudásbázis", "Menetrendszerűség"];

  function render() {
    const root = document.getElementById("pl-kpi-content");
    if (!root) return;
    migrateAll();
    const p = cur();
    const tab = S().pl2Tab || 0;
    const header = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
      <select id="pl2-switch" onchange="PL2.switchProject(this.value)" style="font-family:var(--font);font-size:13px;padding:6px 10px;border:1.5px solid var(--gray200);border-radius:7px;min-width:220px">${S().projects.map((x) => `<option value="${x.id}"${p && x.id === p.id ? " selected" : ""}>${E(x.name)}</option>`).join("")}</select>
      <button class="btn btn-s" onclick="PL2.newProject()">+ Új projekt</button>
      ${p ? `<button class="btn-d" onclick="PL2.deleteProject()">Törlés</button>` : ""}
      <span style="flex:1"></span>
      ${p ? `<span class="pl-pill info">${E(p.lifecycle)}</span><span class="small" style="font-size:12px;color:var(--gray600)">Döntési érettség: <b>${maturity(p).pct}%</b></span>` : ""}
    </div>
    <div class="pl-tab-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${TABS.map((t, i) => `<button class="pl-tab${i === tab ? " active" : ""}" onclick="PL2.tab(${i})">${t}</button>`).join("")}</div>`;
    const body = !p && tab !== 0 && tab !== 10 && tab !== 11 ? '<div class="empty-state">Nincs projekt. Hozz létre egyet.</div>' : [tabPortfolio, tabProject, tabValidation, tabJourney, tabBiz, tabPilot, tabKpi, tabBench, tabProposal, tabPartners, tabKB, tabPunct][tab](p);
    root.innerHTML = header + body;
  }

  // 1 Portfólió
  function tabPortfolio() {
    const ps = S().projects;
    if (!ps.length) return '<div class="empty-state">Nincs projekt.</div>';
    const rows = ps.map((p) => {
      const m = maturity(p), nx = nextPhase(p), g = nx ? gateCheck(p, nx) : { ok: true, missing: [] }, w = waitingSince(p);
      return `<tr style="cursor:pointer" onclick="PL2.open('${p.id}')"><td><b>${E(p.name)}</b><div style="font-size:11px;color:var(--gray400)">${E(p.owner)}</div></td><td>${pill(p.lifecycle)}</td><td>${w == null ? "–" : w + " nap"}</td><td>${m.pct}%</td><td>${p.priority.impact}/${p.priority.effort}</td><td style="font-size:12px">${nx ? (g.ok ? '<span class="pl-pill good">kapu nyitható → ' + E(nx) + "</span>" : g.missing.map((x) => "• " + E(x)).join("<br>")) : "–"}</td></tr>`;
    }).join("");
    const W = 420, Hh = 300;
    const dots = ps.map((p) => {
      const x = 40 + ((num(p.priority.effort) || 0) / 10) * (W - 60), y = Hh - 30 - ((num(p.priority.impact) || 0) / 10) * (Hh - 50);
      return `<g style="cursor:pointer" onclick="PL2.open('${p.id}')"><circle cx="${x}" cy="${y}" r="9" fill="var(--g500)" opacity=".85"/><text x="${x + 12}" y="${y + 4}" font-size="11" fill="var(--gray800)">${E(p.name.slice(0, 28))}</text></g>`;
    }).join("");
    const quad = (x, y, t) => `<text x="${x}" y="${y}" font-size="10" fill="var(--gray400)">${t}</text>`;
    return `<div class="pl-card"><h3>Portfólió · ${ps.length} projekt</h3><table style="width:100%;font-size:13px"><thead><tr><th style="text-align:left">Projekt</th><th style="text-align:left">Fázis</th><th style="text-align:left">Kapu előtt</th><th style="text-align:left">Érettség</th><th style="text-align:left">Hatás/erőf.</th><th style="text-align:left">Következő kapu</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="pl-card" style="margin-top:14px"><h3>Hatás / erőfeszítés mátrix</h3><svg viewBox="0 0 ${W} ${Hh}" style="width:100%;max-width:720px;background:var(--gray50);border-radius:8px">
      <line x1="40" y1="${Hh - 30}" x2="${W - 20}" y2="${Hh - 30}" stroke="var(--gray200)"/><line x1="40" y1="20" x2="40" y2="${Hh - 30}" stroke="var(--gray200)"/>
      <line x1="${40 + (W - 60) / 2}" y1="20" x2="${40 + (W - 60) / 2}" y2="${Hh - 30}" stroke="var(--gray200)" stroke-dasharray="4 4"/><line x1="40" y1="${Hh - 30 - (Hh - 50) / 2}" x2="${W - 20}" y2="${Hh - 30 - (Hh - 50) / 2}" stroke="var(--gray200)" stroke-dasharray="4 4"/>
      ${quad(46, 32, "GYORS GYŐZELEM")}${quad(W / 2 + 10, 32, "STRATÉGIAI")}${quad(46, Hh - 36, "KITÖLTŐ")}${quad(W / 2 + 10, Hh - 36, "KÉRDÉSES")}
      <text x="${W / 2}" y="${Hh - 6}" font-size="11" text-anchor="middle" fill="var(--gray600)">erőfeszítés →</text><text x="12" y="${Hh / 2}" font-size="11" fill="var(--gray600)" transform="rotate(-90 12 ${Hh / 2})">hatás →</text>${dots}</svg></div>`;
  }

  // 2 Projekt + kapuk
  function tabProject(p) {
    const nx = nextPhase(p), g = nx ? gateCheck(p, nx) : null, w = waitingSince(p);
    const lc = `<div class="pl-lifecycle" style="margin-bottom:14px">${LC.map((l, i) => `<div class="pl-lc-step${i <= LC.indexOf(p.lifecycle) ? " active" : ""}" title="${l}">${l}</div>`).join("")}</div>`;
    const gate = nx ? `<div class="pl-card"><h3>Következő kapu: ${E(p.lifecycle)} → ${E(nx)} ${w != null ? `<span style="font-size:11px;color:var(--gray400);font-weight:400">· ${w} napja ebben a fázisban</span>` : ""}</h3>
      ${g.ok ? '<div class="pl-pill good">Minden feltétel teljesül.</div>' : "<ul style='margin:6px 0 10px 18px;font-size:13px'>" + g.missing.map((m) => `<li>${E(m)}</li>`).join("") + "</ul>"}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="pl2-gate-by" placeholder="Döntéshozó neve" style="padding:6px 10px;border:1.5px solid var(--gray200);border-radius:7px;font-family:var(--font);font-size:13px"><input id="pl2-gate-note" placeholder="Döntés, megjegyzés" style="flex:1;min-width:200px;padding:6px 10px;border:1.5px solid var(--gray200);border-radius:7px;font-family:var(--font);font-size:13px"><button class="btn btn-p" onclick="PL2.gate('${nx}')"${g.ok ? "" : " disabled title='A feltételek nem teljesülnek'"}>Kapu átlépése</button><button class="btn btn-s" onclick="PL2.gateBack()">Visszalépés</button></div></div>` : '<div class="pl-card">Utolsó fázis.</div>';
    const log = `<div class="pl-card" style="margin-top:14px"><h3>Kapunapló</h3><table style="width:100%;font-size:12px"><tbody>${[...p.gateLog].reverse().map((l) => `<tr><td>${E((l.at || "").slice(0, 10))}</td><td>${E(l.from || "–")} → <b>${E(l.to)}</b></td><td>${E(l.by || "–")}</td><td style="color:var(--gray600)">${E(l.note || "")}</td></tr>`).join("")}</tbody></table></div>`;
    return lc + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="pl-card"><h3>Projekt</h3>${row("Név", inp("name", p.name))}${row("Felelős", inp("owner", p.owner))}${row("Hatás (1–10)", inp("priority.impact", p.priority.impact, "", "number", 'min="1" max="10"'))}${row("Erőfeszítés (1–10)", inp("priority.effort", p.priority.effort, "", "number", 'min="1" max="10"'))}</div>
      <div class="pl-card"><h3>Probléma</h3>${row("Problémameghatározás", ta("problem.statement", p.problem.statement, 3))}${row("Érintett utas", inp("problem.affectedWho", p.problem.affectedWho))}${row("Térség / vonal", inp("problem.region", p.problem.region))}${row("Jelenlegi megoldás", inp("problem.currentSolution", p.problem.currentSolution))}${row("Miért most", inp("problem.whyNeeded", p.problem.whyNeeded))}${row("Cél", inp("problem.goal", p.problem.goal))}${row("Határidő", inp("problem.deadline", p.problem.deadline))}${row("Érintett szervezetek", inp("problem.orgsInvolved", p.problem.orgsInvolved))}</div></div>
      <div style="margin-top:14px">${gate}</div>${log}`;
  }

  // 3 Validáció
  function tabValidation(p) {
    const m = maturity(p);
    const rows = p.validation.map((v, i) => `<div class="pl-card" style="margin-bottom:10px"><div class="pl-inline" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
      ${sel(`validation.${i}.type`, v.type, VTYPES)} ${sel(`validation.${i}.risk`, v.risk, RISKS)} ${sel(`validation.${i}.status`, v.status, VSTAT)} ${pill(v.type, typeCls[v.type])}${v.type !== "TÉNY" ? pill("kockázat: " + v.risk, riskCls[v.risk]) : ""}${pill(v.status, v.status === "igazolt" ? "good" : v.status === "elvetett" ? "bad" : "warn")}
      <span style="flex:1"></span><button onclick="PL2.del('validation',${i})" style="border:none;background:none;color:var(--gray400);cursor:pointer">✕</button></div>
      ${row("Állítás", ta(`validation.${i}.text`, v.text, 2))}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${row("Forrás (honnan tudjuk)", inp(`validation.${i}.source`, v.source, "adatbázis, kutatás, hivatkozás"))}${row("Ellenőrizte", inp(`validation.${i}.verifiedBy`, v.verifiedBy))}${row("Mikor", inp(`validation.${i}.verifiedAt`, v.verifiedAt, "", "date"))}</div>
      ${v.type !== "TÉNY" ? row("Mi dől el, ha hamis", ta(`validation.${i}.ifFalse`, v.ifFalse, 2, "pl. a helyfoglalás nem csökkenti a torlódást → a koncepció alapja elvész")) : ""}</div>`).join("");
    return `<div class="pl-card" style="margin-bottom:14px"><h3>Döntési érettség: ${m.pct}%</h3><div class="pl-pill info" style="margin-bottom:6px">30% forrásolt tények · 40% lezárt magas kockázatú feltételezések · 30% meghaladott kapuk</div>${m.missing.length ? "<ul style='margin:6px 0 0 18px;font-size:13px'>" + m.missing.map((x) => `<li>${E(x)}</li>`).join("") + "</ul>" : '<div class="small" style="font-size:13px">Nincs hiányzó elem.</div>'}</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><button class="btn btn-p" onclick="PL2.add('validation')">+ Tétel</button><button class="btn btn-s" onclick="PL2.aiTo('pl2-val-ai','Nézd át a validációs tételeket. 1) Melyik a 3 legkockázatosabb feltételezés, és milyen olcsó, gyors ellenőrzéssel igazolható vagy vethető el? 2) Mely tények forrása gyenge? 3) Milyen tény hiányzik a döntéshez? Jelöld: ADATALAPÚ ÉSZREVÉTEL vagy AI HIPOTÉZIS.')">✨ Kockázat-rangsor</button></div><div id="pl2-val-ai" class="pl-ai-out" style="display:none;margin-bottom:12px"></div>${rows || '<div class="empty-state">Nincs validációs tétel.</div>'}`;
  }

  // 4 Utazási lánc
  function tabJourney(p) {
    const c = p.complaints, maxC = Math.max(1, ...p.journey.map((j) => j.complaints || 0));
    const cards = p.journey.map((j, i) => `<div class="pl-card" style="padding:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:12px">${j.stage}</b>${j.complaints ? `<span class="pl-pill ${j.complaints / maxC > 0.6 ? "bad" : j.complaints / maxC > 0.3 ? "warn" : "info"}">${j.complaints} panasz</span>` : ""}</div>
      <div style="height:4px;background:var(--gray100);border-radius:2px;margin:6px 0"><div style="height:4px;width:${Math.round((100 * (j.complaints || 0)) / maxC)}%;background:var(--red);border-radius:2px"></div></div>
      ${row("Fájdalompont", inp(`journey.${i}.painPoint`, j.painPoint))}${row("Súlyosság", sel(`journey.${i}.severity`, j.severity, ["", "magas", "közepes", "alacsony"]))}${row("Lehetőség", inp(`journey.${i}.opportunity`, j.opportunity))}${row("KPI", inp(`journey.${i}.kpi`, j.kpi))}</div>`).join("");
    return `<div class="pl-card" style="margin-bottom:14px"><h3>Panaszadat a lánchoz</h3><p style="font-size:12.5px;color:var(--gray600);margin:4px 0 8px">CSV (ügyfélszolgálati export). Ha van „szakasz” oszlop, azt használja; különben a panasz szövegét kulcsszavak alapján sorolja a 12 szakaszhoz. Csak az összesítés tárolódik, a sorok nem.</p>
      <input type="file" accept=".csv,text/csv" onchange="PL2.importCsv(this.files[0])">${c ? `<div style="margin-top:10px;font-size:12.5px">Importálva: ${E(c.importedAt.slice(0, 10))} · ${c.total} panasz · ${c.unmatched} nem besorolható · ${c.stageColumn ? "szakasz oszlop alapján" : "kulcsszavak alapján"}${c.topCats.length ? "<br>Leggyakoribb kategóriák: " + c.topCats.map(([k, n]) => `${E(k)} (${n})`).join(", ") : ""}</div>` : ""}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">${cards}</div>`;
  }

  // 5 Üzleti eset
  function tabBiz(p) {
    const m = p.bizcase.model, r = calcBiz(p), s = sensitivity(p);
    const money = (v) => fmtN(v) + " Ft";
    const yearRows = r.rows.map((x) => `<tr><td>${x.t}.</td><td>${money(x.benefit)}</td><td>${money(x.opex)}</td><td>${money(x.net)}</td><td>${money(x.disc)}</td><td style="color:${x.cum < 0 ? "var(--red)" : "var(--g600)"}">${money(x.cum)}</td></tr>`).join("");
    const sens = s.out.length ? `<table style="width:100%;font-size:12px"><thead><tr><th style="text-align:left">Paraméter</th><th>−20%</th><th>+20%</th></tr></thead><tbody>${["egyszeri költség", "érintett utas/év", "bevétel/utas", "megtakarítás/év"].map((l) => { const a = s.out.find((o) => o.label === l && o.f === 0.8), b = s.out.find((o) => o.label === l && o.f === 1.2); return a && b ? `<tr><td>${l}</td><td style="text-align:center;color:${a.npv < 0 ? "var(--red)" : "inherit"}">${money(a.npv)}</td><td style="text-align:center;color:${b.npv < 0 ? "var(--red)" : "inherit"}">${money(b.npv)}</td></tr>` : ""; }).join("")}</tbody></table>` : '<div class="small" style="font-size:12px">Adj meg költséget és hatást.</div>';
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="pl-card"><h3>Számmodell</h3>${row("Egyszeri költség (Ft)", inp("bizcase.model.capex", m.capex, "", "number"))}${row("Éves működési költség (Ft)", inp("bizcase.model.opexYear", m.opexYear, "", "number"))}${row("Érintett utas / év", inp("bizcase.model.paxYear", m.paxYear, "", "number"))}${row("Többletbevétel / utas (Ft)", inp("bizcase.model.revPerPax", m.revPerPax, "", "number"))}${row("Egyéb megtakarítás / év (Ft)", inp("bizcase.model.savingYear", m.savingYear, "", "number"))}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">${row("Időtáv (év)", inp("bizcase.model.horizon", m.horizon, "", "number"))}${row("Diszkont (%)", inp("bizcase.model.discount", m.discount, "", "number"))}${row("1. év felfutás (%)", inp("bizcase.model.rampUp", m.rampUp, "", "number"))}</div></div>
      <div class="pl-card"><h3>Eredmény</h3><div style="display:flex;gap:18px;flex-wrap:wrap"><div><div class="pl-kpi-num" style="color:${r.npv != null && r.npv < 0 ? "var(--red)" : "var(--g600)"}">${r.npv == null ? "–" : money(r.npv)}</div><div class="pl-kpi-label">Nettó jelenérték (NPV)</div></div><div><div class="pl-kpi-num">${r.payback == null ? "–" : fmtN(r.payback, 1) + " év"}</div><div class="pl-kpi-label">Megtérülés (diszkontálatlan)</div></div><div><div class="pl-kpi-num">${money(r.benefitFull)}</div><div class="pl-kpi-label">Teljes éves hatás</div></div></div>
      <h3 style="margin-top:14px">Érzékenység (NPV)</h3>${sens}<p style="font-size:11.5px;color:var(--gray400);margin-top:8px">Minden számot a validációban BECSLÉS-ként kell szerepeltetni, forrással. A modell egyszerűsített: lineáris, infláció nélkül.</p></div></div>
      ${r.rows.length ? `<div class="pl-card" style="margin-top:14px"><h3>Évenként</h3><table style="width:100%;font-size:12px"><thead><tr><th>Év</th><th>Hatás</th><th>Működés</th><th>Nettó</th><th>Diszkontált</th><th>Kumulált</th></tr></thead><tbody>${yearRows}</tbody></table></div>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px"><div class="pl-card">${row("Háttér", ta("bizcase.background", p.bizcase.background, 4))}${row("Javasolt megoldás", ta("bizcase.proposal", p.bizcase.proposal, 4))}</div><div class="pl-card">${row("Alternatívák (a semmittevés is)", ta("bizcase.alternatives", p.bizcase.alternatives, 4))}${row("Kockázatok és mérséklés", ta("bizcase.risks", p.bizcase.risks, 4))}${p.bizcase.notes ? `<div style="font-size:11.5px;color:var(--gray400);white-space:pre-line">${E(p.bizcase.notes)}</div>` : ""}</div></div>
      ${teknoPanel(p)}
      <div style="margin-top:12px"><button class="btn btn-s" onclick="PL2.aiTo('pl2-biz-ai','Értékeld az üzleti esetet döntéshozó szemmel: melyik paraméter a legérzékenyebb, mely számok becslések forrás nélkül, mi hiányzik az alternatívák közül (a semmittevés költsége is), és mit kellene a pilotban mérni, hogy a becslések tényekké váljanak. Jelöld: ADATALAPÚ vagy AI HIPOTÉZIS.')">✨ Üzleti eset kritika</button></div><div id="pl2-biz-ai" class="pl-ai-out" style="display:none;margin-top:10px"></div>`;
  }

  // 6 Pilot
  function tabPilot(p) {
    const n = sampleSize(p.pilot.sampleBaselinePct, p.pilot.sampleEffectPp), q = p.pilot;
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="pl-card"><h3>Mérési terv</h3>${row("Hipotézis (ha X, akkor Y mérhetően változik)", ta("pilot.hypothesis", q.hypothesis, 2))}${row("Mért mutató", inp("pilot.metric", q.metric, "pl. elutasított kerékpáros felszállás aránya"))}${row("Bázisérték (a pilot előtt)", inp("pilot.baseline", q.baseline))}${row("Várt hatás", inp("pilot.effect", q.effect))}${row("Kontroll (másik vonal, másik időszak, A/B)", inp("pilot.control", q.control))}${row("Időtáv", inp("pilot.duration", q.duration))}${row("Helyszín", inp("pilot.location", q.location))}${row("Időszak", inp("pilot.period", q.period))}</div>
      <div class="pl-card"><h3>Előre rögzített küszöbök</h3>${row("Sikerküszöb (ennél folytatjuk)", inp("pilot.success", q.success, "pl. elutasítás −30%"))}${row("Leállítási küszöb (ennél abbahagyjuk)", inp("pilot.stop", q.stop, "pl. nincs legalább 10% javulás"))}${row("Döntési dátum", inp("pilot.decisionDate", q.decisionDate, "", "date"))}${row("Döntéshozó", inp("pilot.decider", q.decider))}${row("Eredmény (a pilot után)", ta("pilot.outcome", q.outcome, 3))}
      <h3 style="margin-top:12px">Mintanagyság (arány típusú mutatóra)</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${row("Bázisarány (%)", inp("pilot.sampleBaselinePct", q.sampleBaselinePct, "pl. 12", "number"))}${row("Kimutatandó javulás (százalékpont)", inp("pilot.sampleEffectPp", q.sampleEffectPp, "pl. 4", "number"))}</div><div style="font-size:12.5px">${n ? `Csoportonként legalább <b>${fmtN(n)}</b> megfigyelés (95% konfidencia, 80% erő, kétmintás arányteszt).` : "Add meg a bázisarányt és a kimutatandó javulást."}</div></div></div>
      <div style="margin-top:12px"><button class="btn btn-s" onclick="PL2.aiTo('pl2-pilot-ai','Bírálj el egy pilot-tervet módszertanilag: mérhető-e a hipotézis a megadott mutatóval, jó-e a kontroll, reális-e az időtáv és a minta, előre rögzítettek-e a küszöbök, milyen torzítások fenyegetnek (szezon, Hawthorne, kiválasztás). Adj 3 konkrét javítást.')">✨ Pilot bírálat</button></div><div id="pl2-pilot-ai" class="pl-ai-out" style="display:none;margin-top:10px"></div>`;
  }

  // 7 KPI
  function tabKpi(p) {
    const cards = p.kpis.map((k, i) => { const t = num(k.target), c = num(k.current), bad = /panasz|késés|elutas|hiba/i.test(k.name); const ok = t ? (bad ? c <= t : c >= t) : null;
      return `<div class="pl-card"><div style="display:flex;justify-content:space-between"><b style="font-size:13px">${E(k.name)}</b><button onclick="PL2.del('kpis',${i})" style="border:none;background:none;color:var(--gray400);cursor:pointer">✕</button></div><div style="font-size:11px;color:var(--gray400)">${E(k.unit)} · ${E(k.category)}</div>
      <div style="display:flex;gap:12px;align-items:flex-end;margin:8px 0"><div><div class="pl-kpi-num" style="font-size:26px;color:${ok == null ? "inherit" : ok ? "var(--g600)" : "var(--red)"}">${k.current === "" ? "–" : E(k.current)}</div><div class="pl-kpi-label">Tény</div></div><div style="color:var(--gray300);font-size:20px">→</div><div><div class="pl-kpi-num" style="font-size:26px">${k.target === "" ? "–" : E(k.target)}</div><div class="pl-kpi-label">Cél</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${inp(`kpis.${i}.current`, k.current, "Tény", "number")}${inp(`kpis.${i}.target`, k.target, "Cél", "number")}</div></div>`; }).join("");
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-bottom:14px">${cards || '<div class="empty-state">Nincs KPI.</div>'}</div>
      <div class="pl-card"><h3>+ Új KPI</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="pl2-kpi-name" placeholder="Név" style="flex:2;min-width:140px"><input id="pl2-kpi-unit" placeholder="Egység" style="flex:1;min-width:90px"><select id="pl2-kpi-cat"><option>ÜZLETI</option><option>UTASÉLMÉNY</option><option>OPERÁCIÓ</option><option>DIGITÁLIS</option></select><input id="pl2-kpi-target" type="number" placeholder="Cél" style="width:100px"><button class="btn btn-p" onclick="PL2.addKpi()">Hozzáadás</button></div></div>`;
  }

  // 8 Benchmark
  function tabBench(p) {
    const rows = p.benchmarks.map((b, i) => `<div class="pl-card" style="margin-bottom:10px"><div class="pl-inline" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${pill(b.type, b.type === "FORRÁSOLT" ? "good" : "warn")}<span style="flex:1"></span><button onclick="PL2.del('benchmarks',${i})" style="border:none;background:none;color:var(--gray400);cursor:pointer">✕</button></div>
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px">${row("Vasúttársaság / szervezet", inp(`benchmarks.${i}.org`, b.org))}${row("Megoldás", inp(`benchmarks.${i}.solution`, b.solution))}</div>${row("Forrás (URL vagy dokumentum, kötelező)", inp(`benchmarks.${i}.source`, b.source, "https://…"))}${row("Megjegyzés, számok", ta(`benchmarks.${i}.note`, b.note, 2))}</div>`).join("");
    return `<div class="pl-card" style="margin-bottom:12px"><p style="font-size:12.5px;color:var(--gray600);margin:0 0 8px">Az AI itt csak irányt ad: az eredménye mindig <b>AI HIPOTÉZIS</b>, forrás nélkül, ellenőrizendő. Előterjesztésbe csak FORRÁSOLT tétel kerül tényként. Egy tétel akkor lesz forrásolt, ha kitöltöd a forrást.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-p" onclick="PL2.add('benchmarks')">+ Tétel kézzel</button><button class="btn btn-s" onclick="PL2.aiBench()">✨ AI javaslatok (hipotézisként)</button></div><div id="pl2-bench-ai" class="pl-ai-out" style="display:none;margin-top:10px"></div></div>${rows || '<div class="empty-state">Nincs benchmark.</div>'}`;
  }

  // 9 Előterjesztés
  function tabProposal(p) {
    const list = [...p.proposals].reverse().map((v) => `<div class="pl-card" style="margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center"><b>v${v.version}</b><span style="font-size:12px;color:var(--gray400)">${E(v.at.slice(0, 16).replace("T", " "))} · ${E(v.lifecycle)} · érettség ${v.maturity}%</span><span style="flex:1"></span><button class="btn btn-s" onclick="PL2.copy(${v.version})">Másolás</button><button class="btn btn-s" onclick="PL2.print(${v.version})">Nyomtatás</button></div>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px">Szöveg</summary><div style="white-space:pre-wrap;font-size:13px;line-height:1.55;margin-top:8px">${E(v.text)}</div></details>
      <details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;color:var(--gray600)">Mire épül: ${v.facts.length} tény, ${v.estimates.length} becslés/feltételezés</summary><div style="font-size:12px;margin-top:6px"><b>Tények:</b><ul style="margin:4px 0 8px 18px">${v.facts.map((f) => `<li>${E(f)}</li>`).join("") || "<li>nincs</li>"}</ul><b>Becslések, feltételezések, hipotézisek:</b><ul style="margin:4px 0 0 18px">${v.estimates.map((f) => `<li>${E(f)}</li>`).join("") || "<li>nincs</li>"}</ul></div></details></div>`).join("");
    return `<div class="pl-card" style="margin-bottom:12px"><h3>Vezetői előterjesztés</h3><p style="font-size:12.5px;color:var(--gray600);margin:0 0 8px">Fix szerkezet: 1. Döntési kérdés · 2. Helyzet és probléma (tények) · 3. Javaslat · 4. Alternatívák, köztük a semmittevés · 5. Költség és haszon (NPV, megtérülés, érzékenység) · 6. Kockázatok · 7. Pilot és mérés · 8. Ütemezés és határidő · 9. Kért döntés. Minden verzió megőrzi, mely adat volt tény és mely becslés.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-p" onclick="PL2.proposal('exec')">✨ Előterjesztés (új verzió)</button><button class="btn btn-s" onclick="PL2.proposal('onepager')">✨ Egyoldalas</button></div><div id="pl2-prop-ai" class="pl-ai-out" style="display:none;margin-top:10px"></div></div>${list || '<div class="empty-state">Még nincs verzió.</div>'}`;
  }

  // 10 Partnerek
  function tabPartners(p) {
    const lbl = { aktiv: "Aktív", targyalas: "Tárgyalás alatt", potencial: "Potenciális", inaktiv: "Inaktív" }, cls = { aktiv: "good", targyalas: "warn", potencial: "info", inaktiv: "bad" };
    const rows = p.partners.map((x, i) => `<div class="pl-card"><div style="display:flex;justify-content:space-between"><b style="font-size:13px">${E(x.name)}</b><button onclick="PL2.del('partners',${i})" style="border:none;background:none;color:var(--gray400);cursor:pointer">✕</button></div><div style="font-size:11px;color:var(--gray400)">${E(x.contact)}</div>${row("Státusz", sel(`partners.${i}.status`, x.status, Object.keys(lbl)))}${pill(lbl[x.status] || x.status, cls[x.status] || "info")}${row("Megjegyzés", inp(`partners.${i}.note`, x.note))}</div>`).join("");
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:14px">${rows || '<div class="empty-state">Nincs partner.</div>'}</div><div class="pl-card"><h3>+ Partner</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="pl2-pt-name" placeholder="Név" style="flex:2;min-width:140px"><input id="pl2-pt-contact" placeholder="Kapcsolattartó" style="flex:1;min-width:120px"><button class="btn btn-p" onclick="PL2.addPartner()">+</button></div></div>`;
  }

  // 11 Tudásbázis
  function tabKB() {
    const docs = S().kb2 || [];
    const rows = docs.map((d, i) => `<div class="pl-card" style="margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center"><b style="font-size:13px">${E(d.title)}</b>${pill(d.cat)}${d.pinned ? pill("mindig bekerül", "good") : ""}<span style="font-size:11px;color:var(--gray400)">${fmtN((d.text || "").length)} karakter</span><span style="flex:1"></span><button class="btn btn-s" onclick="PL2.kbPin(${i})">${d.pinned ? "Ne mindig" : "Mindig bekerüljön"}</button><button onclick="PL2.kbDel(${i})" style="border:none;background:none;color:var(--gray400);cursor:pointer">✕</button></div>${d.url ? `<a href="${E(d.url)}" target="_blank" style="font-size:11px">forrás</a>` : ""}<details style="margin-top:6px"><summary style="font-size:12px;cursor:pointer">Szöveg</summary><div style="white-space:pre-wrap;font-size:12px;max-height:200px;overflow:auto">${E((d.text || "").slice(0, 4000))}</div></details></div>`).join("");
    return `<div class="pl-card" style="margin-bottom:12px"><h3>Belső tudásbázis</h3><p style="font-size:12.5px;color:var(--gray600);margin:0 0 8px">SZMSZ, üzletszabályzat, díjszabás, stratégia, korábbi előterjesztések. A szöveget ide kell beilleszteni (PDF-ből kimásolva); az AI-hívásokba a projekthez legjobban illő 3 dokumentum első 1800 karaktere kerül be, a kitűzöttek mindig. Nem kerül Firebase-be, csak ebbe a böngészőbe, amíg a közös tárolást nem állítjuk be.</p>
      <div style="display:grid;grid-template-columns:2fr 1fr 2fr;gap:8px"><input id="pl2-kb-title" placeholder="Cím"><select id="pl2-kb-cat"><option>Stratégia</option><option>Szabályozás</option><option>Díjszabás</option><option>Kutatás</option><option>Benchmark</option><option>Előterjesztés</option><option>Egyéb</option></select><input id="pl2-kb-url" placeholder="URL (opcionális)"></div><textarea id="pl2-kb-text" rows="6" placeholder="Beillesztett szöveg…" style="width:100%;margin-top:8px"></textarea><button class="btn btn-p" style="margin-top:8px" onclick="PL2.kbAdd()">Hozzáadás</button></div>${rows || '<div class="empty-state">Nincs dokumentum.</div>'}`;
  }


  // 12 Menetrendszerűség (abigel-stats / data/pontossag.json)
  const PUNCT_URL = "https://raw.githubusercontent.com/molnarzsoltphoto/abigel-stats/main/data/pontossag.json";
  let punct = { data: null, error: null, loading: false, gran: "nap", seg: "", line: "", metric: "pct" };
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + "-W" + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, "0"); }
  function periodKey(datum, gran) { if (gran === "nap") return datum; if (gran === "hónap") return datum.slice(0, 7); return isoWeek(new Date(datum)); }
  function lineLabel(r) { return r.vonal ? `${r.vonal} · ${r.viszonylat}` : r.viszonylat; }
  function puncRows() {
    const rows = punct.data?.napok || [];
    return rows.filter((r) => (!punct.seg || r.szegmens === punct.seg) && (!punct.line || lineLabel(r) === punct.line));
  }
  // súlyozott összesítés egy csoportra (vonatszámmal súlyozva)
  function fold(list) {
    const n = list.reduce((a, r) => a + r.vonatok, 0);
    if (!n) return null;
    const ontime = list.reduce((a, r) => a + (r.menetrendszeru_pct / 100) * r.vonatok, 0);
    const late = list.reduce((a, r) => a + (1 - r.menetrendszeru_pct / 100) * r.vonatok, 0);
    const avg = late ? list.reduce((a, r) => a + r.atlag_keses_percben * (1 - r.menetrendszeru_pct / 100) * r.vonatok, 0) / late : 0;
    return { vonatok: n, pct: Math.round((1000 * ontime) / n) / 10, atlag: Math.round(avg * 10) / 10, p90: Math.max(...list.map((r) => r.p90_keses)), max: Math.max(...list.map((r) => r.max_keses)) };
  }
  function tabPunct() {
    if (!punct.data && !punct.loading && !punct.error) PL2.punctLoad();
    const rows = puncRows();
    const segs = [...new Set((punct.data?.napok || []).map((r) => r.szegmens))].sort();
    const lines = [...new Set((punct.data?.napok || []).filter((r) => !punct.seg || r.szegmens === punct.seg).map(lineLabel))].sort((a, b) => a.localeCompare(b, "hu"));
    const head = `<div class="pl-card" style="margin-bottom:12px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center" class="pl-inline">
      <select onchange="PL2.punctSet('gran',this.value)">${["nap", "hét", "hónap"].map((g) => `<option${punct.gran === g ? " selected" : ""}>${g}</option>`).join("")}</select>
      <select onchange="PL2.punctSet('seg',this.value)"><option value="">minden szegmens</option>${segs.map((g) => `<option value="${E(g)}"${punct.seg === g ? " selected" : ""}>${E(g)}</option>`).join("")}</select>
      <select onchange="PL2.punctSet('line',this.value)" style="max-width:360px"><option value="">minden vonal / viszonylat</option>${lines.map((g) => `<option value="${E(g)}"${punct.line === g ? " selected" : ""}>${E(g)}</option>`).join("")}</select>
      <select onchange="PL2.punctSet('metric',this.value)"><option value="pct"${punct.metric === "pct" ? " selected" : ""}>menetrendszerű %</option><option value="atlag"${punct.metric === "atlag" ? " selected" : ""}>átlagos késés (későknél, perc)</option><option value="p90"${punct.metric === "p90" ? " selected" : ""}>90. percentilis késés</option></select>
      <button class="btn btn-s" onclick="PL2.punctLoad(true)">Frissítés</button>
      <span style="font-size:11.5px;color:var(--gray400)">${punct.data ? "adat: " + E((punct.data.frissitve || "").slice(0, 16).replace("T", " ")) + " · menetrendszerű = legfeljebb " + punct.data.menetrendszeru_kuszob_perc + " perc" : punct.loading ? "betöltés…" : punct.error ? "⚠️ " + E(punct.error) : ""}</span></div>
      <p style="font-size:11.5px;color:var(--gray400);margin:8px 0 0">Forrás: holavonat.is, 20 perces mintavétel; egy vonat naponta egyszer, az utolsó megfigyelt késésével számít (nem végállomási). Szegmens és vonalszám a vonatnévből és a végpontokból becsült. Az adat a gyűjtő bekapcsolásától gyűlik.</p></div>`;
    if (!rows.length) return head + `<div class="empty-state">${punct.loading ? "Betöltés…" : punct.error ? "Nem érhető el az adat." : "Még nincs adat ehhez a szűréshez."}</div>`;
    // időszakonként
    const byP = {};
    rows.forEach((r) => (byP[periodKey(r.datum, punct.gran)] ||= []).push(r));
    const periods = Object.keys(byP).sort().slice(-40).map((k) => ({ k, ...fold(byP[k]) }));
    const val = (x) => (punct.metric === "pct" ? x.pct : punct.metric === "atlag" ? x.atlag : x.p90);
    const maxV = punct.metric === "pct" ? 100 : Math.max(1, ...periods.map(val));
    const W = 760, H = 220, bw = Math.max(6, Math.floor((W - 50) / periods.length) - 3);
    const bars = periods.map((x, i) => { const v = val(x), h = Math.round(((H - 40) * v) / maxV), xx = 40 + i * (bw + 3), col = punct.metric === "pct" ? (v >= 90 ? "var(--g500)" : v >= 75 ? "var(--orange)" : "var(--red)") : "var(--g500)";
      return `<rect x="${xx}" y="${H - 25 - h}" width="${bw}" height="${h}" fill="${col}" rx="2"><title>${E(x.k)}: ${v}${punct.metric === "pct" ? "%" : " perc"} · ${x.vonatok} vonat</title></rect>${bw >= 22 ? `<text x="${xx + bw / 2}" y="${H - 30 - h}" font-size="9" text-anchor="middle" fill="var(--gray600)">${v}</text>` : ""}${i % Math.ceil(periods.length / 8) === 0 ? `<text x="${xx + bw / 2}" y="${H - 10}" font-size="9" text-anchor="middle" fill="var(--gray400)">${E(x.k.slice(punct.gran === "nap" ? 5 : 0))}</text>` : ""}`; }).join("");
    const chart = `<div class="pl-card" style="margin-bottom:12px"><h3>${punct.gran === "nap" ? "Naponta" : punct.gran === "hét" ? "Hetente" : "Havonta"} · ${punct.seg || "minden szegmens"} · ${punct.line || "minden vonal"}</h3><svg viewBox="0 0 ${W} ${H}" style="width:100%"><line x1="40" y1="${H - 25}" x2="${W}" y2="${H - 25}" stroke="var(--gray200)"/>${punct.metric === "pct" ? `<line x1="40" y1="${H - 25 - (H - 40) * 0.9}" x2="${W}" y2="${H - 25 - (H - 40) * 0.9}" stroke="var(--gray200)" stroke-dasharray="3 3"/><text x="0" y="${H - 22 - (H - 40) * 0.9}" font-size="9" fill="var(--gray400)">90%</text>` : ""}${bars}</svg></div>`;
    // vonalak az időszakban
    const byL = {};
    rows.forEach((r) => (byL[lineLabel(r)] ||= []).push(r));
    const lineRows = Object.entries(byL).map(([k, l]) => ({ k, ...fold(l) })).filter((x) => x.vonatok >= 3).sort((a, b) => a.pct - b.pct).slice(0, 40);
    const bySeg = {};
    rows.forEach((r) => (bySeg[r.szegmens] ||= []).push(r));
    const segRows = Object.entries(bySeg).map(([k, l]) => ({ k, ...fold(l) })).sort((a, b) => b.vonatok - a.vonatok);
    const tbl = (list, label) => `<table style="width:100%;font-size:12.5px"><thead><tr><th>${label}</th><th>Vonat</th><th>Menetrendszerű</th><th>Átl. késés (késők)</th><th>p90</th><th>Max</th></tr></thead><tbody>${list.map((x) => `<tr><td>${E(x.k)}</td><td>${x.vonatok}</td><td><span class="pl-pill ${x.pct >= 90 ? "good" : x.pct >= 75 ? "warn" : "bad"}">${x.pct}%</span></td><td>${x.atlag} perc</td><td>${x.p90}</td><td>${x.max}</td></tr>`).join("")}</tbody></table>`;
    return head + chart + `<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px"><div class="pl-card"><h3>Szegmensenként</h3>${tbl(segRows, "Szegmens")}</div><div class="pl-card"><h3>Vonalak a legrosszabbtól (legalább 3 vonat)</h3>${tbl(lineRows, "Vonal · viszonylat")}</div></div>`;
  }


  // ── TEKNO havi jegyriport (Firestore REST, csak olvasás) ──
  const TEKNO = { project: "termekfejlesztes-1ba4e", key: "AIzaSyCNZTo0ABgE8eZ8KMgfKr4fQsGLW0jT_zA", rows: null, loading: false, error: null };
  const TEKNO_SEC = { ic: "IC", ec: "EC", nap: "Napijegyek", csat: "Értékesítési csatorna", elm: "Szolgáltatás-elmaradás" };
  const fsVal = (v) => v == null ? null : "integerValue" in v ? +v.integerValue : "doubleValue" in v ? +v.doubleValue : "stringValue" in v ? v.stringValue : "booleanValue" in v ? v.booleanValue : null;
  async function teknoLoad(force) {
    if (TEKNO.rows && !force) return TEKNO.rows;
    if (TEKNO.loading) return null;
    TEKNO.loading = true; TEKNO.error = null;
    try {
      const rows = []; let token = "";
      do {
        const u = `https://firestore.googleapis.com/v1/projects/${TEKNO.project}/databases/(default)/documents/ticketReport?pageSize=1000${token ? "&pageToken=" + encodeURIComponent(token) : ""}&key=${TEKNO.key}`;
        const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
        if (!r.ok) throw new Error("Firestore " + r.status + (r.status === 403 ? " – a TEKNO olvasási szabálya tiltja" : ""));
        const j = await r.json();
        for (const d of j.documents || []) { const f = d.fields || {}; rows.push({ sec: fsVal(f.sec), y: +fsVal(f.y), m: +fsVal(f.m), metric: fsVal(f.metric), dim: fsVal(f.dim), value: +fsVal(f.value) || 0 }); }
        token = j.nextPageToken || "";
      } while (token);
      TEKNO.rows = rows;
    } catch (e) { TEKNO.error = (e && e.name === "TimeoutError") ? "időtúllépés (20 s) a firestore.googleapis.com felé" : (e.message || String(e)); TEKNO.rows = TEKNO.rows || []; }
    finally { TEKNO.loading = false; }
    return TEKNO.rows;
  }
  // utolsó 12 lezárt hónap összege egy mutatóra (és opcionálisan viszonylatra); visszaadja a hónapok számát is
  function teknoSum(rows, sec, metric, dim) {
    const keys = [...new Set(rows.filter((r) => r.sec === sec && r.metric === metric && (!dim || r.dim === dim)).map((r) => r.y * 100 + r.m))].sort((a, b) => b - a).slice(0, 12);
    const sel = rows.filter((r) => r.sec === sec && r.metric === metric && (!dim || r.dim === dim) && keys.includes(r.y * 100 + r.m));
    return { sum: sel.reduce((a, r) => a + r.value, 0), months: keys.length, from: keys.length ? Math.min(...keys) : null, to: keys.length ? Math.max(...keys) : null };
  }
  const ym = (k) => k ? `${Math.floor(k / 100)}. ${String(k % 100).padStart(2, "0")}.` : "–";
  function teknoPanel(p) {
    const rows = TEKNO.rows;
    const sel = p.bizcase.tekno || {};
    if (!rows) { if (!TEKNO.loading) teknoLoad().then(render, (e) => { TEKNO.error = e.message; TEKNO.rows = []; render(); }); return `<div class="pl-card" style="margin-top:14px"><h3>Mért utasszám a TEKNO jegyriportból</h3><div class="small" style="font-size:12.5px">${TEKNO.error ? "⚠️ " + E(TEKNO.error) : "Betöltés…"}</div></div>`; }
    const secs = [...new Set(rows.map((r) => r.sec))];
    const metrics = [...new Set(rows.filter((r) => r.sec === (sel.sec || secs[0])).map((r) => r.metric))];
    const dims = [...new Set(rows.filter((r) => r.sec === (sel.sec || secs[0])).map((r) => r.dim))].filter(Boolean);
    const t = sel.metric ? teknoSum(rows, sel.sec, sel.metric, sel.dim || null) : null;
    const perYear = t && t.months ? Math.round((t.sum / t.months) * 12) : null;
    return `<div class="pl-card" style="margin-top:14px"><h3>Mért utasszám a TEKNO jegyriportból</h3><p style="font-size:12px;color:var(--gray600);margin:0 0 8px">${rows.length} adatpont · ${TEKNO.error ? "⚠️ " + E(TEKNO.error) : "csak olvasás"} · a kiválasztott mutató utolsó 12 hónapjának összege, évesítve. Átvéve a számmodellbe TÉNY-ként kerül a validációba, forrással.</p>
      <div class="pl-inline" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select onchange="PL2.teknoPick('sec',this.value)">${secs.map((x) => `<option value="${E(x)}"${(sel.sec || secs[0]) === x ? " selected" : ""}>${E(TEKNO_SEC[x] || x)}</option>`).join("")}</select>
        <select onchange="PL2.teknoPick('metric',this.value)"><option value="">mutató…</option>${metrics.map((x) => `<option value="${E(x)}"${sel.metric === x ? " selected" : ""}>${E(x)}</option>`).join("")}</select>
        ${dims.length ? `<select onchange="PL2.teknoPick('dim',this.value)"><option value="">összes viszonylat/csatorna</option>${dims.map((x) => `<option value="${E(x)}"${sel.dim === x ? " selected" : ""}>${E(x)}</option>`).join("")}</select>` : ""}
        <button class="btn btn-s" onclick="PL2.teknoReload()">Frissítés</button></div>
      ${t ? `<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;align-items:flex-end"><div><div class="pl-kpi-num">${fmtN(t.sum)}</div><div class="pl-kpi-label">${t.months} hónap összege (${ym(t.from)} – ${ym(t.to)})</div></div><div><div class="pl-kpi-num">${perYear == null ? "–" : fmtN(perYear)}</div><div class="pl-kpi-label">évesítve</div></div><button class="btn btn-p" onclick="PL2.teknoApply()"${perYear ? "" : " disabled"}>Átvétel: érintett utas / év</button></div>` : ""}</div>`;
  }

  // ── műveletek ──
  function setPath(obj, path, val) {
    const ks = path.split("."), last = ks.pop();
    let o = obj;
    for (const k of ks) o = o[k];
    const isNum = ["capex", "opexYear", "paxYear", "revPerPax", "savingYear", "horizon", "discount", "rampUp", "impact", "effort"].includes(last);
    o[last] = isNum ? num(val) : val;
  }
  let liveTimer = null;
  const PL2 = (window.PL2 = {
    render,
    tab(i) { S().pl2Tab = i; render(); },
    switchProject(id) { S().currentProjectId = id; persist(); render(); },
    open(id) { S().currentProjectId = id; S().pl2Tab = 1; persist(); render(); },
    set(path, val) {
      const p = cur(); if (!p) return;
      setPath(p, path, val); persist();
      // számmodell és priorítás: élő újraszámolás a mezők megtartásával
      if (/^bizcase\.model\.|^pilot\.sample|^priority\./.test(path)) { clearTimeout(liveTimer); liveTimer = setTimeout(() => { const a = document.activeElement; const id = a?.id; const sel = a ? a.getAttribute("oninput") : null; render(); if (sel) { const el = [...document.querySelectorAll("input,textarea")].find((e) => e.getAttribute("oninput") === sel); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {} } } }, 500); }
    },
    newProject() {
      const name = prompt("Projekt neve:"); if (!name) return;
      const p = migrate({ id: uid("p"), name, phase: "Ötlet", owner: "", desc: "", segments: [], insights: [], kpis: [], partners: [], bizcase: {} });
      p.gateLog = [{ from: null, to: "ÖTLET", at: new Date().toISOString(), by: "", note: "létrehozva" }];
      S().projects.push(p); S().currentProjectId = p.id; S().pl2Tab = 1; persist(); render();
    },
    deleteProject() {
      const p = cur(); if (!p || !confirm(`Törlöd: ${p.name}?`)) return;
      S().projects = S().projects.filter((x) => x.id !== p.id); S().currentProjectId = S().projects[0]?.id; persist(); render();
    },
    add(list) {
      const p = cur(); if (!p) return;
      if (list === "validation") p.validation.push({ id: uid("v"), type: "FELTÉTELEZÉS", text: "", source: "", verifiedBy: "", verifiedAt: "", ifFalse: "", risk: "közepes", status: "nyitott" });
      if (list === "benchmarks") p.benchmarks.push({ id: uid("b"), org: "", solution: "", source: "", type: "FORRÁSOLT", note: "" });
      persist(); render();
    },
    del(list, i) { const p = cur(); if (!p) return; p[list].splice(i, 1); persist(); render(); },
    addKpi() {
      const p = cur(); const n = document.getElementById("pl2-kpi-name")?.value.trim(); if (!p || !n) return;
      p.kpis.push({ id: uid("k"), name: n, unit: document.getElementById("pl2-kpi-unit").value, category: document.getElementById("pl2-kpi-cat").value, target: document.getElementById("pl2-kpi-target").value, current: "" }); persist(); render();
    },
    addPartner() {
      const p = cur(); const n = document.getElementById("pl2-pt-name")?.value.trim(); if (!p || !n) return;
      p.partners.push({ id: uid("pt"), name: n, contact: document.getElementById("pl2-pt-contact").value, status: "potencial", note: "" }); persist(); render();
    },
    gate(to) {
      const p = cur(); if (!p) return;
      const g = gateCheck(p, to); if (!g.ok) { alert("Hiányzik: " + g.missing.join("; ")); return; }
      const by = document.getElementById("pl2-gate-by")?.value.trim(); if (!by) { alert("Add meg a döntéshozó nevét."); return; }
      p.gateLog.push({ from: p.lifecycle, to, at: new Date().toISOString(), by, note: document.getElementById("pl2-gate-note")?.value || "" }); p.lifecycle = to; persist(); render();
    },
    gateBack() {
      const p = cur(); const i = LC.indexOf(p.lifecycle); if (i <= 0) return;
      const why = prompt("Visszalépés oka (naplózva):"); if (why == null) return;
      p.gateLog.push({ from: p.lifecycle, to: LC[i - 1], at: new Date().toISOString(), by: "", note: "visszalépés: " + why }); p.lifecycle = LC[i - 1]; persist(); render();
    },
    importCsv(file) {
      const p = cur(); if (!p || !file) return;
      const rd = new FileReader(); rd.onload = () => { const r = importComplaints(p, String(rd.result || "")); alert(r.msg); if (r.ok) { persist(); render(); } }; rd.readAsText(file, "utf-8");
    },
    async aiTo(outId, instruction) {
      const p = cur(), out = document.getElementById(outId); if (!p || !out) return;
      out.style.display = "block"; out.textContent = "⏳ Elemzés…";
      try { out.textContent = await ai(instruction + "\n\n" + ctx(p)); } catch (e) { out.textContent = "⚠️ " + e.message; }
    },
    async aiBench() {
      const p = cur(), out = document.getElementById("pl2-bench-ai"); if (!p || !out) return;
      out.style.display = "block"; out.textContent = "⏳ Javaslatok…";
      try {
        const t = await ai("Sorolj fel 4-6 európai vasúttársasági példát (ÖBB, DB, SBB, ČD, PKP, ZSSK, NS, SNCF, Trenitalia), amelyek a projekt problémájára hasonló megoldást alkalmaznak. Minden tételnél: szervezet, megoldás egy mondatban, mit érdemes ellenőrizni és hol (dokumentum vagy oldal típusa). Ne találj ki számokat, ha nem vagy biztos, írd: ellenőrizendő. Formátum soronként: SZERVEZET | MEGOLDÁS | ELLENŐRIZENDŐ.\n\n" + ctx(p), 1500);
        const lines = t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((a) => a.length >= 2 && a[0].length < 40);
        lines.forEach((a) => p.benchmarks.push({ id: uid("b"), org: a[0], solution: a[1], source: "", type: "AI HIPOTÉZIS", note: a[2] || "" }));
        persist(); render(); const o2 = document.getElementById("pl2-bench-ai"); if (o2) { o2.style.display = "block"; o2.textContent = lines.length ? `${lines.length} tétel felvéve AI HIPOTÉZIS-ként. Forrást adj hozzá, hogy FORRÁSOLT legyen.` : t; }
      } catch (e) { out.textContent = "⚠️ " + e.message; }
    },
    async proposal(kind) {
      const p = cur(), out = document.getElementById("pl2-prop-ai"); if (!p || !out) return;
      out.style.display = "block"; out.textContent = "⏳ Generálás…";
      const facts = p.validation.filter((v) => v.type === "TÉNY").map((v) => v.text + (v.source ? ` [${v.source}]` : " [FORRÁS NÉLKÜL]"));
      const est = p.validation.filter((v) => v.type !== "TÉNY").map((v) => `${v.type}: ${v.text}`).concat(p.benchmarks.filter((b) => b.type !== "FORRÁSOLT").map((b) => `BENCHMARK (nem forrásolt): ${b.org} – ${b.solution}`));
      const structure = kind === "exec"
        ? "1. Döntési kérdés (egy mondat) 2. Helyzet és probléma (csak tények, forrással) 3. Javaslat 4. Alternatívák, köztük a semmittevés következménye 5. Költség és haszon: NPV, megtérülés, a két legérzékenyebb paraméter 6. Kockázatok és mérséklés 7. Pilot és mérés: hipotézis, mutató, küszöbök, döntési dátum 8. Ütemezés 9. Kért döntés. Terjedelem: legfeljebb 700 szó."
        : "Egyoldalas vezetői összefoglaló: Döntési kérdés · Probléma (2 tény) · Javaslat · Hatás (NPV, megtérülés) · Legnagyobb kockázat · Kért döntés és határidő. Legfeljebb 250 szó.";
      try {
        const text = await ai(`Készíts vezetői előterjesztést. Szerkezet: ${structure}\nSzabály: a „Helyzet” részben csak a TÉNYEK szerepelhetnek; a becsléseket, feltételezéseket, hipotéziseket mindig ezzel a szóval jelöld, és a végén külön „Mire épül” blokkban sorold fel a tényeket és a becsléseket.\n\n${ctx(p)}`, 3000);
        const version = (p.proposals.at(-1)?.version || 0) + 1;
        p.proposals.push({ version, at: new Date().toISOString(), kind, text, facts, estimates: est, lifecycle: p.lifecycle, maturity: maturity(p).pct });
        persist(); render();
      } catch (e) { out.textContent = "⚠️ " + e.message; }
    },
    copy(v) { const p = cur(), x = p?.proposals.find((q) => q.version === v); if (x) navigator.clipboard?.writeText(x.text); },
    print(v) {
      const p = cur(), x = p?.proposals.find((q) => q.version === v); if (!x) return;
      const w = window.open("", "_blank"); if (!w) return;
      w.document.write(`<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${E(p.name)} – előterjesztés v${v}</title><style>body{font:14px/1.6 Georgia,serif;max-width:800px;margin:40px auto;color:#222}h1{font-size:20px}pre{white-space:pre-wrap;font:inherit}small{color:#666}</style></head><body><h1>${E(p.name)} · vezetői előterjesztés v${v}</h1><small>${E(x.at.slice(0, 10))} · fázis: ${E(x.lifecycle)} · döntési érettség ${x.maturity}%</small><pre>${E(x.text)}</pre><hr><small><b>Tények:</b> ${x.facts.map(E).join(" · ") || "nincs"}<br><b>Becslések:</b> ${x.estimates.map(E).join(" · ") || "nincs"}</small></body></html>`);
      w.document.close(); w.print();
    },
    kbAdd() {
      const t = document.getElementById("pl2-kb-title")?.value.trim(), tx = document.getElementById("pl2-kb-text")?.value.trim(); if (!t || !tx) { alert("Cím és szöveg kell."); return; }
      S().kb2.unshift({ id: uid("d"), title: t, cat: document.getElementById("pl2-kb-cat").value, url: document.getElementById("pl2-kb-url").value, text: tx, pinned: false });
      try { localStorage.setItem("abigel_state", JSON.stringify(STATE)); } catch (_) {} render();
    },
    kbDel(i) { S().kb2.splice(i, 1); try { localStorage.setItem("abigel_state", JSON.stringify(STATE)); } catch (_) {} render(); },
    kbPin(i) { S().kb2[i].pinned = !S().kb2[i].pinned; try { localStorage.setItem("abigel_state", JSON.stringify(STATE)); } catch (_) {} render(); },
    teknoPick(k, v) { const p = cur(); if (!p) return; p.bizcase.tekno ||= {}; p.bizcase.tekno[k] = v; if (k === "sec") { p.bizcase.tekno.metric = ""; p.bizcase.tekno.dim = ""; } persist(); render(); },
    teknoReload() { teknoLoad(true).then(render); render(); },
    teknoApply() {
      const p = cur(), sel = p?.bizcase.tekno; if (!p || !sel?.metric || !TEKNO.rows) return;
      const t = teknoSum(TEKNO.rows, sel.sec, sel.metric, sel.dim || null); if (!t.months) return;
      const perYear = Math.round((t.sum / t.months) * 12);
      p.bizcase.model.paxYear = perYear;
      const label = `${TEKNO_SEC[sel.sec] || sel.sec} · ${sel.metric}${sel.dim ? " · " + sel.dim : ""}`;
      const src = `TEKNO jegyriport, ${label}, ${t.months} hónap (${ym(t.from)} – ${ym(t.to)}) összege ${fmtN(t.sum)}, évesítve`;
      const ex = p.validation.find((v) => v.source?.startsWith("TEKNO jegyriport, " + label));
      if (ex) { ex.text = `Érintett utas/év (mért): ${fmtN(perYear)}`; ex.source = src; ex.verifiedAt = today(); }
      else p.validation.unshift({ id: uid("v"), type: "TÉNY", text: `Érintett utas/év (mért): ${fmtN(perYear)}`, source: src, verifiedBy: "TEKNO (automatikus)", verifiedAt: today(), ifFalse: "", risk: "alacsony", status: "igazolt" });
      persist(); render();
    },
    punctSet(k, v) { punct[k] = v; if (k === "seg") punct.line = ""; render(); },
    async punctLoad(force) {
      if (punct.loading) return;
      punct.loading = true; punct.error = null; render();
      try { const r = await fetch(PUNCT_URL + "?t=" + Math.floor(Date.now() / 300000), { cache: "no-store", signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error("HTTP " + r.status + (r.status === 404 ? " – a gyűjtő még nem futott, vagy nincs a main ágon" : "")); punct.data = await r.json(); }
      catch (e) { punct.error = (e && e.name === "TimeoutError") ? "időtúllépés (20 s)" : (e.message || String(e)); }
      finally { punct.loading = false; }
      render();
    },
    _test: { migrate, calcBiz, sensitivity, sampleSize, importComplaints, gateCheck, maturity, LC, STAGES },
  });

  // bekötés: a KPI oldal lesz a Termékfejlesztés
  function install() {
    if (typeof STATE === "undefined" || typeof showPage !== "function") return setTimeout(install, 50);
    try { if (typeof META !== "undefined") META.pl_kpi = { t: "Termékfejlesztés", s: "Portfólió, döntési kapuk, validáció, üzleti eset, pilot, előterjesztés" }; } catch (_) {}
    window.plRenderKpi = render;
    const btn = document.querySelector(`.nb[onclick="showPage('pl_kpi')"]`);
    if (btn) btn.childNodes.forEach((n) => { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = " Termékfejlesztés"; });
    const gr = document.querySelector("#page-pl_kpi .gr-b");
    if (gr) gr.textContent = "Termékfejlesztés – portfólió, döntési kapuk naplóval, forrásolt validáció, számszerű üzleti eset, pilot-mérési terv, verziózott előterjesztés. (modul v2.1)";
    const st = document.createElement("style");
    st.textContent = `#pl-kpi-content input,#pl-kpi-content select,#pl-kpi-content textarea{font-family:var(--font);font-size:12.5px;border:1.5px solid var(--gray200);border-radius:7px;padding:6px 9px;width:100%;box-sizing:border-box;background:#fff}#pl-kpi-content .pl-form-row{margin-bottom:8px}#pl-kpi-content .pl-form-row label{display:block;font-size:11px;color:var(--gray600);margin-bottom:3px}#pl-kpi-content table th,#pl-kpi-content table td{padding:6px 8px;border-bottom:1px solid var(--gray100);text-align:left}#pl-kpi-content .pl-ai-out{white-space:pre-wrap;font-size:13px;line-height:1.55}#pl-kpi-content .pl-tab{cursor:pointer}#pl-kpi-content .pl-inline select,#pl-kpi-content .pl-inline input{width:auto}`;
    document.head.append(st);
    migrateAll();
    S().pl2Tab ??= 0;
    const page = document.getElementById("page-pl_kpi");
    if (page && page.classList.contains("active")) render();
    // a régi, be nem kötött Product Lab függvények ne írjanak a konténerbe
    if (typeof plEnsureSeedProject === "function") window.plEnsureSeedProject = migrateAll;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
