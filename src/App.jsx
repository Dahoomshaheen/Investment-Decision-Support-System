import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const COLORS = {
  gold:    "#D4A843",
  usd:     "#3B82F6",
  realestate: "#10B981",
  bg:      "#0A0E1A",
  card:    "#111827",
  border:  "#1F2937",
  text:    "#F9FAFB",
  muted:   "#6B7280",
  accent:  "#D4A843",
};

// ─── MOCK DATA ENGINE ─────────────────────────────────────────────────────────
function generateData(country, years) {
  const profiles = {
    Egypt: {
      gold:        { start: 22000,  cagr: 0.42, vol: 0.18, label: "Gold (EGP/oz)" },
      currency:    { start: 18,     cagr: 0.22, vol: 0.25, label: "USD/EGP Rate" },
      realestate:  { start: 4500,   cagr: 0.28, vol: 0.12, label: "RE (EGP/m²)" },
    },
    USA: {
      gold:        { start: 1280,   cagr: 0.12, vol: 0.14, label: "Gold (USD/oz)" },
      currency:    { start: 1,      cagr: 0.02, vol: 0.05, label: "DXY Index" },
      realestate:  { start: 220000, cagr: 0.08, vol: 0.07, label: "RE (USD/home)" },
    },
    Turkey: {
      gold:        { start: 22000,  cagr: 0.55, vol: 0.22, label: "Gold (TRY/oz)" },
      currency:    { start: 5.3,    cagr: 0.45, vol: 0.38, label: "USD/TRY Rate" },
      realestate:  { start: 1200,   cagr: 0.48, vol: 0.20, label: "RE (TRY/m²)" },
    },
    Germany: {
      gold:        { start: 1150,   cagr: 0.09, vol: 0.12, label: "Gold (EUR/oz)" },
      currency:    { start: 1.15,   cagr: -0.01, vol: 0.06, label: "EUR/USD Rate" },
      realestate:  { start: 3800,   cagr: 0.07, vol: 0.06, label: "RE (EUR/m²)" },
    },
  };
  const p = profiles[country] || profiles["Egypt"];
  const months = years * 12;
  const result = [];
  const now = new Date(2019, 0, 1);

  let gold = p.gold.start, usd = p.currency.start, re = p.realestate.start;
  const baseGold = gold, baseUsd = usd, baseRe = re;

  for (let i = 0; i <= months; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString("en", { year: "numeric", month: "short" });

    gold *= (1 + p.gold.cagr / 12 + (Math.random() - 0.48) * p.gold.vol / Math.sqrt(12));
    usd  *= (1 + p.currency.cagr / 12 + (Math.random() - 0.48) * p.currency.vol / Math.sqrt(12));
    re   *= (1 + p.realestate.cagr / 12 + (Math.random() - 0.48) * p.realestate.vol / Math.sqrt(12));

    result.push({
      date:         label,
      gold:         +gold.toFixed(2),
      currency:     +usd.toFixed(4),
      realestate:   +re.toFixed(0),
      goldIdx:      +((gold / baseGold) * 100).toFixed(2),
      usdIdx:       +((usd / baseUsd) * 100).toFixed(2),
      reIdx:        +((re / baseRe) * 100).toFixed(2),
    });
  }
  return { data: result, labels: p };
}

function computeKPIs(series, years) {
  if (!series || series.length < 2) return {};
  const first = series[0], last = series[series.length - 1];
  const totalReturn = ((last - first) / first) * 100;
  const cagr = (Math.pow(last / first, 1 / years) - 1) * 100;
  const returns = series.slice(1).map((v, i) => (v - series[i]) / series[i]);
  const avgR = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgR, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 12) * 100;
  const score = volatility > 0 ? cagr / volatility : 0;
  let maxDD = 0, peak = series[0];
  for (const v of series) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak * 100;
    if (dd < maxDD) maxDD = dd;
  }
  const sharpe = volatility > 0 ? ((cagr - 3) / volatility) : 0; // 3% risk-free
  return { totalReturn, cagr, volatility, score, maxDD, sharpe };
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const KpiCard = ({ label, value, unit = "", sub, color = COLORS.gold, good = true }) => (
  <div style={{
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderTop: `3px solid ${color}`,
    borderRadius: 10,
    padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 4,
  }}>
    <span style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
    <span style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "Georgia, serif" }}>
      {value}{unit}
    </span>
    {sub && <span style={{ fontSize: 11, color: COLORS.muted }}>{sub}</span>}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 14px" }}>
    <div style={{ width: 4, height: 22, background: COLORS.gold, borderRadius: 2 }} />
    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.text, letterSpacing: 0.5 }}>{children}</h2>
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}66`,
    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  }}>{children}</span>
);

const RecommendationCard = ({ asset, rank, kpis, color }) => {
  const stars = rank === 1 ? "★★★" : rank === 2 ? "★★☆" : "★☆☆";
  const verdict = rank === 1 ? "BEST BET" : rank === 2 ? "SOLID HOLD" : "HIGH RISK";
  const verdictColor = rank === 1 ? "#10B981" : rank === 2 ? COLORS.gold : "#EF4444";
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${rank === 1 ? color + "88" : COLORS.border}`,
      borderRadius: 12, padding: "18px 20px",
      boxShadow: rank === 1 ? `0 0 20px ${color}22` : "none",
      position: "relative", overflow: "hidden",
    }}>
      {rank === 1 && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          background: verdictColor + "22", color: verdictColor,
          border: `1px solid ${verdictColor}66`,
          borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 1,
        }}>TOP PICK ✦</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{asset}</span>
        <span style={{ fontSize: 16, color }}>{stars}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          ["Total Return", `${kpis.totalReturn?.toFixed(1)}%`],
          ["CAGR", `${kpis.cagr?.toFixed(1)}%`],
          ["Volatility", `${kpis.volatility?.toFixed(1)}%`],
          ["Sharpe Ratio", kpis.sharpe?.toFixed(2)],
          ["Max Drawdown", `${kpis.maxDD?.toFixed(1)}%`],
          ["Perf. Score", kpis.score?.toFixed(2)],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "#0D1117", borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ fontSize: 10, color: COLORS.muted }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: COLORS.muted }}>Verdict</span>
        <Badge color={verdictColor}>{verdict}</Badge>
      </div>
    </div>
  );
};

// ─── TOOLTIP STYLES ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1F2937", border: "1px solid #374151",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: COLORS.muted, marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value?.toFixed ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function InvestmentDSS() {
  const [country, setCountry] = useState("Egypt");
  const [years, setYears] = useState(5);
  const [activeTab, setActiveTab] = useState("overview");
  const [compareCountry, setCompareCountry] = useState("USA");

  const { data, labels } = useMemo(() => generateData(country, years), [country, years]);
  const { data: compareData, labels: compareLabels } = useMemo(() => generateData(compareCountry, years), [compareCountry, years]);

  const assets = [
    { key: "gold",       label: "Gold",        color: COLORS.gold },
    { key: "currency",   label: "Currency",    color: COLORS.usd },
    { key: "realestate", label: "Real Estate", color: COLORS.realestate },
  ];

  const kpisMap = useMemo(() => {
    const r = {};
    for (const a of assets) {
      r[a.key] = computeKPIs(data.map(d => d[a.key]), years);
    }
    return r;
  }, [data, years]);

  const ranked = useMemo(() => {
    return [...assets].sort((a, b) => (kpisMap[b.key].score || 0) - (kpisMap[a.key].score || 0));
  }, [kpisMap]);

  // Radar data
  const radarData = useMemo(() => {
    const normalize = (arr) => {
      const mn = Math.min(...arr), mx = Math.max(...arr);
      return arr.map(v => mx === mn ? 50 : ((v - mn) / (mx - mn)) * 100);
    };
    const metrics = ["Return", "CAGR", "Sharpe", "Inv.Vol", "Inv.DD", "Score"];
    const vals = assets.map(a => {
      const k = kpisMap[a.key];
      return [k.totalReturn || 0, k.cagr || 0, k.sharpe || 0, -(k.volatility || 0), -(k.maxDD || 0), k.score || 0];
    });
    return metrics.map((m, mi) => {
      const obj = { metric: m };
      const col = normalize(assets.map((_, ai) => vals[ai][mi]));
      assets.forEach((a, ai) => { obj[a.label] = +col[ai].toFixed(1); });
      return obj;
    });
  }, [kpisMap]);

  // Compare data (indexed)
  const compareChartData = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 36));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d, i) => ({
      date: d.date,
      [`${country} Gold`]: d.goldIdx,
      [`${compareCountry} Gold`]: compareData[Math.min(i * step, compareData.length - 1)]?.goldIdx || 100,
    }));
  }, [data, compareData, country, compareCountry]);

  // Sampled chart data
  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 48));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  // Annual bar data
  const annualData = useMemo(() => {
    const byYear = {};
    data.forEach(d => {
      const yr = d.date.slice(-4);
      if (!byYear[yr]) byYear[yr] = { year: yr, gold: [], currency: [], realestate: [] };
      byYear[yr].gold.push(d.gold);
      byYear[yr].currency.push(d.currency);
      byYear[yr].realestate.push(d.realestate);
    });
    return Object.values(byYear).map(yr => ({
      year: yr.year,
      Gold:        yr.gold.length > 1   ? +((yr.gold[yr.gold.length-1] / yr.gold[0] - 1)*100).toFixed(1) : 0,
      Currency:    yr.currency.length > 1 ? +((yr.currency[yr.currency.length-1] / yr.currency[0] - 1)*100).toFixed(1) : 0,
      "Real Estate": yr.realestate.length > 1 ? +((yr.realestate[yr.realestate.length-1] / yr.realestate[0] - 1)*100).toFixed(1) : 0,
    }));
  }, [data]);

  const countries = ["Egypt", "USA", "Turkey", "Germany"];
  const periods = [{ v: 1, l: "1 Year" }, { v: 3, l: "3 Years" }, { v: 5, l: "5 Years" }];
  const tabs = ["overview", "charts", "risk", "compare", "recommend"];

  const top = ranked[0];
  const topKpi = kpisMap[top.key];

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      color: COLORS.text, fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: 0, margin: 0,
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, #0D1117 0%, #111827 100%)",
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "20px 28px 16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.gold + "33", border: `1px solid ${COLORS.gold}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>◈</div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: COLORS.text, fontFamily: "Georgia, serif" }}>
                Investment Decision Support System
              </h1>
            </div>
            <p style={{ margin: "4px 0 0 42px", fontSize: 12, color: COLORS.muted }}>
              Historical performance analytics · Risk-adjusted recommendations · {country} · {years}Y window
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Country Selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {countries.map(c => (
                <button key={c} onClick={() => setCountry(c)} style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${country === c ? COLORS.gold : COLORS.border}`,
                  background: country === c ? COLORS.gold + "22" : COLORS.card,
                  color: country === c ? COLORS.gold : COLORS.muted,
                  cursor: "pointer",
                }}>{c}</button>
              ))}
            </div>
            {/* Period Selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {periods.map(p => (
                <button key={p.v} onClick={() => setYears(p.v)} style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${years === p.v ? COLORS.usd : COLORS.border}`,
                  background: years === p.v ? COLORS.usd + "22" : COLORS.card,
                  color: years === p.v ? COLORS.usd : COLORS.muted,
                  cursor: "pointer",
                }}>{p.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginTop: 18, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: "8px 18px", fontSize: 12, fontWeight: 600,
              background: "none", border: "none",
              borderBottom: activeTab === t ? `2px solid ${COLORS.gold}` : "2px solid transparent",
              color: activeTab === t ? COLORS.gold : COLORS.muted,
              cursor: "pointer", textTransform: "capitalize", letterSpacing: 0.5,
              transition: "all 0.15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "20px 28px 40px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {activeTab === "overview" && (
          <>
            {/* Alert Banner */}
            <div style={{
              background: `linear-gradient(90deg, ${top.color}15, transparent)`,
              border: `1px solid ${top.color}44`,
              borderLeft: `4px solid ${top.color}`,
              borderRadius: 8, padding: "12px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 24,
            }}>
              <div>
                <span style={{ fontSize: 12, color: top.color, fontWeight: 700 }}>◆ DATA-DRIVEN RECOMMENDATION</span>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: COLORS.text }}>
                  Based on {years}-year historical data for <strong style={{ color: top.color }}>{country}</strong>, the top-performing asset is{" "}
                  <strong style={{ color: top.color }}>{top.label}</strong> with a Performance Score of{" "}
                  <strong>{topKpi.score?.toFixed(2)}</strong> and CAGR of <strong>{topKpi.cagr?.toFixed(1)}%</strong>.
                </p>
              </div>
              <Badge color={top.color}>#{1} RANKED</Badge>
            </div>

            {/* KPI Grid */}
            <SectionTitle>Key Performance Indicators — {country}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              {assets.map(a => (
                <KpiCard
                  key={a.key}
                  label={`${a.label} · Total Return`}
                  value={kpisMap[a.key].totalReturn?.toFixed(1)}
                  unit="%"
                  sub={`CAGR: ${kpisMap[a.key].cagr?.toFixed(1)}% | Vol: ${kpisMap[a.key].volatility?.toFixed(1)}%`}
                  color={a.color}
                />
              ))}
              <KpiCard label="Best Asset Score" value={topKpi.score?.toFixed(2)} unit="" sub={`Return / Risk ratio`} color={top.color} />
              <KpiCard label="Best Sharpe Ratio" value={ranked[0] ? kpisMap[ranked[0].key].sharpe?.toFixed(2) : "—"} sub="Risk-adjusted excess return" color={COLORS.gold} />
              <KpiCard label="Lowest Drawdown" value={(() => {
                const best = [...assets].sort((a, b) => (kpisMap[b.key].maxDD || -999) - (kpisMap[a.key].maxDD || -999));
                return kpisMap[best[0].key].maxDD?.toFixed(1);
              })()} unit="%" sub="Peak-to-trough decline" color={COLORS.realestate} />
            </div>

            {/* Indexed Performance Chart */}
            <SectionTitle>Historical Indexed Performance (Base 100)</SectionTitle>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 12px" }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    {assets.map(a => (
                      <linearGradient key={a.key} id={`grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={a.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={a.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 10 }} tickLine={false} interval={Math.floor(chartData.length / 6)} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 10 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
                  <ReferenceLine y={100} stroke="#374151" strokeDasharray="4 4" label={{ value: "Base 100", fill: COLORS.muted, fontSize: 10 }} />
                  {assets.map(a => (
                    <Area key={a.key} type="monotone" dataKey={`${a.key}Idx`} name={a.label}
                      stroke={a.color} strokeWidth={2} fill={`url(#grad-${a.key})`} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ═══════════ CHARTS TAB ═══════════ */}
        {activeTab === "charts" && (
          <>
            <SectionTitle>Annual Returns by Asset (%)</SectionTitle>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 12px" }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={annualData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: COLORS.muted, fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 10 }} tickLine={false} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#374151" />
                  <Bar dataKey="Gold" fill={COLORS.gold} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Currency" fill={COLORS.usd} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Real Estate" fill={COLORS.realestate} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Raw Price Trends</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "gold",      label: labels.gold.label,       color: COLORS.gold },
                { key: "currency",  label: labels.currency.label,   color: COLORS.usd },
                { key: "realestate",label: labels.realestate.label, color: COLORS.realestate },
              ].map(a => (
                <div key={a.key} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.color, marginBottom: 8 }}>{a.label}</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`g2-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={a.color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={a.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A2235" />
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey={a.key} stroke={a.color} strokeWidth={2} fill={`url(#g2-${a.key})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════ RISK TAB ═══════════ */}
        {activeTab === "risk" && (
          <>
            <SectionTitle>Risk Radar — Multi-Dimension Comparison</SectionTitle>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px" }}>
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#1F2937" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: COLORS.muted, fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 9 }} />
                  {assets.map(a => (
                    <Radar key={a.key} name={a.label} dataKey={a.label}
                      stroke={a.color} fill={a.color} fillOpacity={0.18} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <p style={{ textAlign: "center", fontSize: 11, color: COLORS.muted, margin: "4px 0 0" }}>
                Higher = better on all axes. Inv.Vol = inverted volatility (lower vol → higher score). Inv.DD = inverted max drawdown.
              </p>
            </div>

            <SectionTitle>Risk vs Return Matrix</SectionTitle>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {assets.map(a => {
                  const k = kpisMap[a.key];
                  const riskLevel = k.volatility > 30 ? "HIGH" : k.volatility > 15 ? "MEDIUM" : "LOW";
                  const riskColor = riskLevel === "HIGH" ? "#EF4444" : riskLevel === "MEDIUM" ? COLORS.gold : "#10B981";
                  return (
                    <div key={a.key} style={{ background: "#0D1117", borderRadius: 8, padding: 16, border: `1px solid ${a.color}33` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, color: a.color, fontSize: 14 }}>{a.label}</span>
                        <Badge color={riskColor}>{riskLevel} RISK</Badge>
                      </div>
                      {[
                        ["Volatility",   `${k.volatility?.toFixed(1)}%`,   "Annualised std dev"],
                        ["Max Drawdown", `${k.maxDD?.toFixed(1)}%`,        "Worst peak→trough"],
                        ["Sharpe Ratio", k.sharpe?.toFixed(2),             "(r - rf) / vol"],
                        ["Perf. Score",  k.score?.toFixed(2),              "CAGR / Volatility"],
                      ].map(([l, v, hint]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1F2937" }}>
                          <div>
                            <div style={{ fontSize: 12, color: COLORS.text }}>{l}</div>
                            <div style={{ fontSize: 9, color: COLORS.muted }}>{hint}</div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: a.color }}>{v}</span>
                        </div>
                      ))}
                      {/* Risk bar */}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>Risk Exposure</div>
                        <div style={{ height: 6, background: "#1F2937", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, (k.volatility || 0) * 2)}%`, background: riskColor, borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ═══════════ COMPARE TAB ═══════════ */}
        {activeTab === "compare" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: COLORS.muted }}>Compare {country} against:</span>
              <div style={{ display: "flex", gap: 4 }}>
                {countries.filter(c => c !== country).map(c => (
                  <button key={c} onClick={() => setCompareCountry(c)} style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${compareCountry === c ? COLORS.usd : COLORS.border}`,
                    background: compareCountry === c ? COLORS.usd + "22" : COLORS.card,
                    color: compareCountry === c ? COLORS.usd : COLORS.muted,
                    cursor: "pointer",
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <SectionTitle>Gold Performance: {country} vs {compareCountry}</SectionTitle>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 12px" }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={compareChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 10 }} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 10 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={100} stroke="#374151" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey={`${country} Gold`} stroke={COLORS.gold} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey={`${compareCountry} Gold`} stroke={COLORS.usd} strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <SectionTitle>Side-by-Side KPI Comparison</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { c: country,        d: kpisMap,                          color: COLORS.gold },
                { c: compareCountry, d: (() => {
                  const r = {};
                  for (const a of assets) r[a.key] = computeKPIs(compareData.map(d => d[a.key]), years);
                  return r;
                })(), color: COLORS.usd },
              ].map(({ c, d, color }) => (
                <div key={c} style={{ background: COLORS.card, border: `1px solid ${color}44`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color, marginBottom: 14 }}>{c}</div>
                  {assets.map(a => (
                    <div key={a.key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2937" }}>
                      <span style={{ fontSize: 12, color: COLORS.muted }}>{a.label}</span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{d[a.key].totalReturn?.toFixed(1)}%</div>
                        <div style={{ fontSize: 10, color: COLORS.muted }}>CAGR {d[a.key].cagr?.toFixed(1)}% | Score {d[a.key].score?.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════════ RECOMMEND TAB ═══════════ */}
        {activeTab === "recommend" && (
          <>
            <div style={{
              background: "linear-gradient(135deg, #0D1117, #111827)",
              border: `1px solid ${COLORS.gold}44`,
              borderRadius: 12, padding: "20px 24px", marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>◆ INVESTMENT RECOMMENDATION ENGINE</div>
              <p style={{ margin: 0, fontSize: 13, color: "#D1D5DB", lineHeight: 1.7 }}>
                Rankings are determined by the <strong style={{ color: COLORS.gold }}>Performance Score (CAGR ÷ Volatility)</strong> — a risk-adjusted metric
                that rewards consistent, stable returns over raw gains. Assets are scored across 6 dimensions:
                Total Return, CAGR, Sharpe Ratio, Volatility, Max Drawdown, and Performance Score.
                This analysis is based on <strong style={{ color: COLORS.gold }}>{years}-year historical data for {country}</strong>.
                Past performance does not guarantee future results.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {ranked.map((a, i) => (
                <RecommendationCard key={a.key} asset={a.label} rank={i + 1} kpis={kpisMap[a.key]} color={a.color} />
              ))}
            </div>

            {/* Decision Matrix */}
            <SectionTitle>Decision Matrix by Investor Profile</SectionTitle>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
              {[
                { profile: "🛡️ Conservative Investor", goal: "Capital Preservation", horizon: "1–3 yrs", asset: ranked.sort((a,b) => (kpisMap[a.key].volatility||99)-(kpisMap[b.key].volatility||99))[0].label, why: "Lowest volatility and drawdown exposure" },
                { profile: "⚖️ Balanced Investor",     goal: "Growth + Stability",   horizon: "3–5 yrs", asset: ranked[0].label, why: "Best risk-adjusted return (Performance Score)" },
                { profile: "🚀 Aggressive Investor",   goal: "Maximum Return",       horizon: "5+ yrs",  asset: [...assets].sort((a,b) => (kpisMap[b.key].totalReturn||0)-(kpisMap[a.key].totalReturn||0))[0].label, why: "Highest total return over the full period" },
                { profile: "📊 Income Focused",        goal: "Steady Appreciation",  horizon: "3–5 yrs", asset: ranked[0].label, why: "Most consistent year-over-year appreciation" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 2.5fr",
                  padding: "12px 18px", borderBottom: i < 3 ? `1px solid ${COLORS.border}` : "none",
                  background: i % 2 === 0 ? "#0D1117" : COLORS.card,
                  fontSize: 12, alignItems: "center",
                }}>
                  <span style={{ fontWeight: 700, color: COLORS.text }}>{row.profile}</span>
                  <span style={{ color: COLORS.muted }}>{row.goal}</span>
                  <span style={{ color: COLORS.muted }}>{row.horizon}</span>
                  <span style={{ fontWeight: 700, color: COLORS.gold }}>→ {row.asset}</span>
                  <span style={{ color: COLORS.muted, fontSize: 11 }}>{row.why}</span>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop: 24, padding: "12px 16px",
              background: "#EF444411", border: "1px solid #EF444433",
              borderRadius: 8, fontSize: 11, color: "#FCA5A5",
            }}>
              ⚠️ <strong>Disclaimer:</strong> This system uses simulated historical data for demonstration purposes.
              All recommendations are purely data-driven based on historical performance metrics. This is not financial advice.
              Always consult a qualified financial advisor before making investment decisions.
            </div>
          </>
        )}
      </div>
    </div>
  );
}