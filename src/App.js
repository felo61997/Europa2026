import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeTxns, addTxn, removeTxn } from "./firebase";
import { fetchRates, fmtD, fmtI, today, toUSD } from "./helpers";
import { Chip, PersonChip, DiffBadge, AlertBadge, Toggle } from "./components";
import {
  C, BUDGET, PEOPLE, CURRENCIES, TAGS, ITEMS, SECTIONS,
  AUTO_TAGS, TAG_C, PERSON_C
} from "./config";

const TABS = ["gastos", "transacciones", "diario", "balance", "gráficos", "notas"];

export default function App() {
  const [txns, setTxns]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState("gastos");
  const [collapsed, setCollapsed]   = useState({});
  const [modal, setModal]           = useState(false);
  const [tagFilter, setTagFilter]   = useState(null);
  const [personFilter, setPersonFilter] = useState(null);
  const [dayFilter, setDayFilter]   = useState(null);
  const [rates, setRates]           = useState({ USD:1, EUR:1.08, CLP:0.00105 });
  const [ratesTs, setRatesTs]       = useState(null);
  const [formErr, setFormErr]       = useState("");
  const amountRef = useRef(null);

  const [form, setForm] = useState({
    date: today(), item:"v0", tag:"transporte", person:"Felipe",
    desc:"", amount:"", currency:"USD", split:false,
  });
  const [editingId, setEditingId] = useState(null); // null = new, string = editing existing

  // ── Firestore realtime listener ──────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeTxns(data => {
      setTxns(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Exchange rates ────────────────────────────────────────────────────────
  const refreshRates = useCallback(async () => {
    const r = await fetchRates();
    setRates(r);
    setRatesTs(new Date());
  }, []);
  useEffect(() => { refreshRates(); }, [refreshRates]);

  // ── Derived values ────────────────────────────────────────────────────────
  const realByKey = {};
  ITEMS.forEach(it => { realByKey[it.key] = 0; });
  txns.forEach(t => {
    if (realByKey[t.item] !== undefined)
      realByKey[t.item] += toUSD(t.amount, t.currency || "USD", rates);
  });

  const totalReal    = Object.values(realByKey).reduce((a, b) => a + b, 0);
  const totalPlanned = ITEMS.reduce((a, it) => a + it.plan, 0);
  const totalDiff    = totalReal - totalPlanned;
  const slack        = BUDGET - totalReal;
  const progPct      = Math.min((totalReal / BUDGET) * 100, 100);

  const realByCat = {}, planByCat = {};
  SECTIONS.forEach(s => { realByCat[s.id] = 0; planByCat[s.id] = 0; });
  ITEMS.forEach(it => {
    realByCat[it.cat] = (realByCat[it.cat] || 0) + realByKey[it.key];
    planByCat[it.cat] = (planByCat[it.cat] || 0) + it.plan;
  });

  const sectionAlerts = SECTIONS.filter(sec => {
    const pct = planByCat[sec.id] > 0 ? (realByCat[sec.id] / planByCat[sec.id]) * 100 : 0;
    return pct >= 80;
  });

  const dailyTotals = {};
  txns.forEach(t => {
    const usd = toUSD(t.amount, t.currency || "USD", rates);
    dailyTotals[t.date] = (dailyTotals[t.date] || 0) + usd;
  });

  const spentBy = { Felipe:0, Antonia:0 };
  const paidBy  = { Felipe:0, Antonia:0 };
  txns.forEach(t => {
    const usd = toUSD(t.amount, t.currency || "USD", rates);
    paidBy[t.person] = (paidBy[t.person] || 0) + usd;
    if (t.split) { spentBy.Felipe += usd / 2; spentBy.Antonia += usd / 2; }
    else { spentBy[t.person] = (spentBy[t.person] || 0) + usd; }
  });
  const owes = paidBy.Felipe - spentBy.Felipe;

  // ── Submit (create or update) ─────────────────────────────────────────────
  async function submitForm() {
    // Normalize amount: replace comma with dot for parsing
    const rawAmount = String(form.amount).replace(",", ".");
    const parsedAmount = parseFloat(rawAmount);
    if (!form.date || !form.desc.trim() || !rawAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormErr("Completa todos los campos."); return;
    }
    setFormErr("");
    setSaving(true);
    try {
      const txnData = {
        date:     form.date,
        item:     form.item,
        tag:      form.tag,
        person:   form.person,
        desc:     form.desc.trim(),
        amount:   parsedAmount,
        currency: form.currency,
        split:    form.split,
      };
      if (editingId) {
        // Update: delete old + add new (Firestore doesn't have update in our helper, simplest approach)
        await removeTxn(editingId);
        await addTxn(txnData);
      } else {
        await addTxn(txnData);
      }
      setForm(f => ({ ...f, desc:"", amount:"", split:false }));
      setEditingId(null);
      setModal(false);
    } catch (e) {
      setFormErr("Error al guardar. Verifica tu conexión.");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    await removeTxn(id);
  }

  function handleItemChange(key) {
    setForm(f => ({ ...f, item:key, tag: AUTO_TAGS[key] || f.tag }));
  }

  function openModal() {
    setEditingId(null);
    setForm({ date: today(), item:"v0", tag:"transporte", person:"Felipe", desc:"", amount:"", currency:"USD", split:false });
    setModal(true);
    setTimeout(() => amountRef.current?.focus(), 150);
  }

  function openEditModal(t) {
    setEditingId(t.id);
    setForm({
      date:     t.date,
      item:     t.item,
      tag:      t.tag,
      person:   t.person,
      desc:     t.desc,
      amount:   String(t.amount),
      currency: t.currency || "USD",
      split:    t.split || false,
    });
    setModal(true);
    setTimeout(() => amountRef.current?.focus(), 150);
  }

  // ── Reusable style tokens ─────────────────────────────────────────────────
  const th = {
    padding:"7px 14px", fontSize:"0.62rem", fontFamily:"monospace",
    color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em",
    textAlign:"left", fontWeight:400, background:C.surface,
    borderBottom:`1px solid ${C.border}`,
  };
  const td = { padding:"9px 14px", fontSize:"0.8rem", borderBottom:`1px solid ${C.border}`, color:C.text };
  const inputSt = {
    background:C.surface, border:`1px solid ${C.border}`, color:C.text,
    borderRadius:6, fontFamily:"inherit", fontSize:"0.85rem",
    padding:"9px 11px", width:"100%", outline:"none", boxSizing:"border-box",
  };
  const selectSt = { ...inputSt, fontFamily:"monospace", fontSize:"0.8rem", cursor:"pointer" };
  const labelSt  = {
    fontSize:"0.68rem", color:C.muted, fontFamily:"monospace",
    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5, display:"block",
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
      <div style={{ fontFamily:"Georgia,serif", fontSize:"1.5rem", color:C.accent, fontWeight:300 }}>
        Europa <em>2026</em>
      </div>
      <div style={{ color:C.muted, fontFamily:"monospace", fontSize:"0.8rem" }}>
        Cargando gastos…
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.bg,
      color:C.text, minHeight:"100vh", paddingBottom:80 }}>

      {/* ══ HEADER ══ */}
      <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"env(safe-area-inset-top,0) 0 0",
        position:"sticky", top:0, zIndex:100 }}>
        <div style={{ padding:"14px 18px 0", display:"flex",
          alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontWeight:300, fontSize:"1.45rem",
              letterSpacing:"-0.02em", color:C.accent, lineHeight:1.1 }}>
              Europa <em>2026</em>
            </div>
            <div style={{ fontSize:"0.65rem", color:C.muted, marginTop:2,
              fontFamily:"monospace", letterSpacing:"0.07em", textTransform:"uppercase" }}>
              Felipe &amp; Antonia · 15 Jul – 2 Ago
            </div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            <div style={{ fontSize:"0.65rem", fontFamily:"monospace", color:C.muted,
              background:C.card, border:`1px solid ${C.border}`,
              borderRadius:5, padding:"4px 8px", lineHeight:1.4 }}>
              1 EUR = <span style={{color:C.text}}>{fmtD(rates.EUR)}</span>
              <button onClick={refreshRates} style={{ background:"none", border:"none",
                color:C.accent, cursor:"pointer", fontSize:"0.75rem", marginLeft:4, padding:0 }}>
                ↻
              </button>
            </div>
            {saving && (
              <div style={{ fontSize:"0.65rem", color:C.muted, fontFamily:"monospace" }}>
                guardando…
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding:"10px 18px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            fontSize:"0.64rem", color:C.muted, fontFamily:"monospace", marginBottom:4 }}>
            <span>USD {fmtI(totalReal)} gastados</span>
            <span>Presupuesto USD 3.500</span>
          </div>
          <div style={{ height:4, background:C.card, borderRadius:2, position:"relative" }}>
            <div style={{ height:"100%", borderRadius:2, transition:"width .6s",
              width:`${progPct}%`,
              background: progPct > 100 ? C.over : progPct > 80 ? C.warn : C.under }} />
            <div style={{ position:"absolute", right:0, top:-2, width:2,
              height:8, background:C.muted, borderRadius:1 }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", overflowX:"auto", paddingTop:8,
          scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background:"none", border:"none",
              borderBottom:`2px solid ${activeTab===tab ? C.accent : "transparent"}`,
              color: activeTab===tab ? C.accent : C.muted,
              padding:"8px 14px", fontSize:"0.73rem", cursor:"pointer",
              fontFamily:"monospace", whiteSpace:"nowrap", marginBottom:-1,
              textTransform:"capitalize", flexShrink:0,
            }}>{tab}</button>
          ))}
        </div>
      </header>

      {/* ══ ALERTS BANNER ══ */}
      {sectionAlerts.length > 0 && (
        <div style={{ background:"rgba(232,122,122,.07)",
          borderBottom:`1px solid rgba(232,122,122,.2)`,
          padding:"8px 18px", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:"0.68rem", color:C.over, fontFamily:"monospace", fontWeight:600 }}>
            ⚠ Alertas:
          </span>
          {sectionAlerts.map(sec => {
            const pct = Math.round((realByCat[sec.id] / planByCat[sec.id]) * 100);
            return (
              <span key={sec.id} style={{ fontSize:"0.68rem", color:C.over,
                fontFamily:"monospace", background:"rgba(232,122,122,.1)",
                border:"1px solid rgba(232,122,122,.25)", borderRadius:4, padding:"2px 7px" }}>
                {sec.icon} {sec.label} {pct}%
              </span>
            );
          })}
        </div>
      )}

      {/* ══ KPI ROW ══ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)",
        gap:1, background:C.border, borderBottom:`1px solid ${C.border}` }}>
        {[
          { label:"Gastado",    val:`USD ${fmtI(totalReal)}`,
            color: totalReal > BUDGET ? C.over : C.text,
            sub:`${Math.round((totalReal/BUDGET)*100)}%` },
          { label:"Diferencia",
            val: txns.length > 0 ? `${totalDiff>0?"+":""}${fmtD(totalDiff)}` : "–",
            color: txns.length > 0 ? (totalDiff<=0?C.under:C.over) : C.muted,
            sub: txns.length > 0 ? (totalDiff<=0?"✓ bajo plan":"sobre plan") : "sin datos" },
          { label:"Restante",
            val:`${slack>=0?"":"−"}USD ${fmtI(Math.abs(slack))}`,
            color: slack >= 0 ? C.under : C.over,
            sub: Math.abs(owes) < 0.5 ? "balance ✓"
              : owes > 0 ? `Antonia: −${fmtI(Math.abs(owes))}`
              : `Felipe: −${fmtI(Math.abs(owes))}` },
        ].map((it,i) => (
          <div key={i} style={{ background:C.surface, padding:"11px 14px" }}>
            <div style={{ fontSize:"0.6rem", color:C.muted, textTransform:"uppercase",
              letterSpacing:"0.09em", fontFamily:"monospace", marginBottom:3 }}>{it.label}</div>
            <div style={{ fontFamily:"monospace", fontSize:"0.97rem",
              fontWeight:600, color:it.color||C.text }}>{it.val}</div>
            <div style={{ fontSize:"0.62rem", color:C.muted, marginTop:2 }}>{it.sub}</div>
          </div>
        ))}
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <main style={{ padding:"16px 16px 20px", maxWidth:900, margin:"0 auto" }}>

        {/* ─── GASTOS ─── */}
        {activeTab === "gastos" && SECTIONS.map(sec => {
          const items   = ITEMS.filter(it => it.cat === sec.id);
          const planSum = items.reduce((a, it) => a + it.plan, 0);
          const realSum = items.reduce((a, it) => a + realByKey[it.key], 0);
          const diff    = realSum - planSum;
          const pct     = planSum > 0 ? (realSum / planSum) * 100 : 0;
          const isCol   = collapsed[sec.id];
          const hasReal = realSum > 0;

          return (
            <div key={sec.id} style={{
              marginBottom:14, background:C.card, borderRadius:10, overflow:"hidden",
              border:`1px solid ${pct>=100?"rgba(232,122,122,.45)":pct>=80?"rgba(232,160,122,.35)":C.border}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"11px 14px", background:C.surface,
                borderBottom:`1px solid ${C.border}`, cursor:"pointer", userSelect:"none" }}
                onClick={() => setCollapsed(c => ({ ...c, [sec.id]: !c[sec.id] }))}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:"1rem" }}>{sec.icon}</span>
                  <span style={{ fontFamily:"Georgia,serif", fontWeight:600, fontSize:"0.9rem" }}>
                    {sec.label}
                  </span>
                  <AlertBadge pct={pct} />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontFamily:"monospace", fontSize:"0.7rem", textAlign:"right" }}>
                    <span style={{ color:C.muted }}>USD {fmtI(planSum)}</span>
                    {hasReal && (
                      <span style={{ color: diff<=0?C.under:C.over, marginLeft:8 }}>
                        {diff>0?"+":""}{fmtD(diff)}
                      </span>
                    )}
                  </div>
                  <span style={{ color:C.muted, fontSize:"0.8rem", display:"inline-block",
                    transform: isCol ? "rotate(-90deg)" : "none", transition:"transform .2s" }}>▾</span>
                </div>
              </div>

              {!isCol && (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
                    <thead><tr>
                      <th style={th}>Concepto</th>
                      <th style={{...th,textAlign:"right"}}>Plan</th>
                      <th style={{...th,textAlign:"right"}}>Real</th>
                      <th style={{...th,textAlign:"right"}}>Dif.</th>
                    </tr></thead>
                    <tbody>
                      {items.map(it => {
                        const real = realByKey[it.key];
                        const hasR = real > 0;
                        const dif  = real - it.plan;
                        const ipct = it.plan > 0 ? (real / it.plan) * 100 : 0;
                        return (
                          <tr key={it.key} style={{ borderBottom:`1px solid ${C.border}` }}>
                            <td style={td}>
                              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                                  background: hasR ? (dif<=0?C.under:C.over) : C.muted,
                                  display:"inline-block" }} />
                                <span style={{ fontSize:"0.78rem" }}>{it.label}</span>
                                {ipct >= 80 && <AlertBadge pct={ipct} />}
                              </div>
                            </td>
                            <td style={{...td,textAlign:"right",fontFamily:"monospace",
                              color:C.muted,fontSize:"0.75rem"}}>{fmtD(it.plan)}</td>
                            <td style={{...td,textAlign:"right",fontFamily:"monospace",fontWeight:600,fontSize:"0.78rem"}}>
                              {hasR ? fmtD(real) : <span style={{color:C.muted}}>–</span>}
                            </td>
                            <td style={{...td,textAlign:"right"}}>
                              {hasR ? <DiffBadge real={real} plan={it.plan}/> : <span style={{color:C.muted,fontSize:"0.7rem"}}>–</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ─── TRANSACCIONES ─── */}
        {activeTab === "transacciones" && (() => {
          let filtered = txns;
          if (tagFilter)    filtered = filtered.filter(t => t.tag === tagFilter);
          if (personFilter) filtered = filtered.filter(t => t.person === personFilter);
          if (dayFilter)    filtered = filtered.filter(t => t.date === dayFilter);
          const filteredTotal = filtered.reduce((a,t) => a + toUSD(t.amount, t.currency||"USD", rates), 0);

          return (
            <div>
              {/* Filter pills */}
              <div style={{ display:"flex", gap:5, marginBottom:8, flexWrap:"wrap" }}>
                {[null,...TAGS.map(t=>t.id)].map(t => (
                  <button key={t||"all"} onClick={()=>setTagFilter(t)} style={{
                    background: tagFilter===t ? C.accent : C.surface,
                    color: tagFilter===t ? C.bg : C.muted,
                    border:`1px solid ${C.border}`, borderRadius:20,
                    padding:"3px 10px", fontSize:"0.65rem", fontFamily:"monospace", cursor:"pointer",
                  }}>{t===null ? "Todos" : TAGS.find(tg=>tg.id===t)?.label||t}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
                {[null,...PEOPLE].map(p => (
                  <button key={p||"all"} onClick={()=>setPersonFilter(p)} style={{
                    background: personFilter===p ? (p ? PERSON_C[p]?.color : C.accent) : C.surface,
                    color: personFilter===p ? C.bg : C.muted,
                    border:`1px solid ${C.border}`, borderRadius:20,
                    padding:"3px 10px", fontSize:"0.65rem", fontFamily:"monospace", cursor:"pointer",
                  }}>{p||"Ambos"}</button>
                ))}
                {dayFilter && (
                  <button onClick={()=>setDayFilter(null)} style={{
                    background:"rgba(232,201,122,.1)", color:C.accent,
                    border:`1px solid rgba(232,201,122,.3)`, borderRadius:20,
                    padding:"3px 10px", fontSize:"0.65rem", fontFamily:"monospace", cursor:"pointer",
                  }}>📅 {dayFilter} ×</button>
                )}
              </div>

              {filtered.length === 0
                ? <div style={{ textAlign:"center", padding:"44px 20px", color:C.muted, fontSize:"0.85rem" }}>
                    {txns.length === 0
                      ? <>Presiona el <strong style={{color:C.accent}}>+</strong> para agregar el primer gasto.</>
                      : "Sin resultados para este filtro."}
                  </div>
                : <>
                    <div style={{ fontSize:"0.67rem", color:C.muted, fontFamily:"monospace",
                      marginBottom:8, textAlign:"right" }}>
                      {filtered.length} gasto{filtered.length>1?"s":""} ·
                      <span style={{color:C.text}}> USD {fmtD(filteredTotal)}</span>
                    </div>
                    <div style={{ background:C.card, border:`1px solid ${C.border}`,
                      borderRadius:10, overflow:"hidden" }}>
                      {filtered.map((t, i) => {
                        const usd = toUSD(t.amount, t.currency||"USD", rates);
                        const showOrig = t.currency && t.currency !== "USD";
                        return (
                          <div key={t.id} style={{ padding:"11px 14px",
                            borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : "none" }}>
                            <div style={{ display:"flex", justifyContent:"space-between",
                              alignItems:"flex-start", gap:8 }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:"flex", alignItems:"center",
                                  gap:6, flexWrap:"wrap", marginBottom:5 }}>
                                  <span style={{ fontFamily:"monospace", fontSize:"0.68rem",
                                    color:C.muted }}>{t.date}</span>
                                  <Chip id={t.tag}/>
                                  <PersonChip name={t.person}/>
                                  {t.split && (
                                    <span style={{ fontSize:"0.62rem", fontFamily:"monospace",
                                      color:C.muted, background:C.surface,
                                      border:`1px solid ${C.border}`, borderRadius:3,
                                      padding:"1px 5px" }}>50/50</span>
                                  )}
                                </div>
                                <div style={{ fontSize:"0.82rem", color:C.text }}>{t.desc}</div>
                                <div style={{ fontSize:"0.7rem", color:C.muted, marginTop:3 }}>
                                  {ITEMS.find(it=>it.key===t.item)?.label||t.item}
                                </div>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontFamily:"monospace", fontWeight:600,
                                  fontSize:"0.9rem", color:C.text }}>
                                  USD {fmtD(usd)}
                                </div>
                                {showOrig && (
                                  <div style={{ fontFamily:"monospace", fontSize:"0.68rem", color:C.muted }}>
                                    {t.currency} {fmtD(t.amount)}
                                  </div>
                                )}
                                <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:6 }}>
                                  <button onClick={()=>openEditModal(t)} style={{
                                    background:"none", border:`1px solid ${C.border}`,
                                    color:C.muted, cursor:"pointer", fontSize:"0.7rem",
                                    padding:"2px 8px", borderRadius:4, fontFamily:"monospace" }}>
                                    editar
                                  </button>
                                  <button onClick={()=>handleDelete(t.id)} style={{
                                    background:"none", border:`1px solid rgba(232,122,122,.3)`,
                                    color:C.over, cursor:"pointer", fontSize:"0.7rem",
                                    padding:"2px 8px", borderRadius:4, fontFamily:"monospace" }}>
                                    borrar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
              }
            </div>
          );
        })()}

        {/* ─── DIARIO ─── */}
        {activeTab === "diario" && (() => {
          const days = Object.keys(dailyTotals).sort((a,b)=>b.localeCompare(a));
          const maxAmt = Math.max(...Object.values(dailyTotals), 1);
          return (
            <div>
              <div style={{ fontSize:"0.7rem", color:C.muted, fontFamily:"monospace", marginBottom:12 }}>
                Gasto por día — toca un día para ver sus transacciones
              </div>
              {days.length === 0
                ? <div style={{ textAlign:"center", padding:"40px", color:C.muted }}>Sin gastos aún.</div>
                : days.map(day => {
                    const amt     = dailyTotals[day];
                    const dayTxns = txns.filter(t => t.date === day);
                    const tagMap  = {};
                    dayTxns.forEach(t => { tagMap[t.tag] = (tagMap[t.tag]||0)+1; });
                    return (
                      <div key={day} onClick={() => { setDayFilter(day); setActiveTab("transacciones"); }}
                        style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9,
                          padding:"12px 14px", marginBottom:9, cursor:"pointer",
                          transition:"border-color .15s" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:7 }}>
                          <div>
                            <div style={{ fontFamily:"monospace", fontSize:"0.82rem", color:C.text, marginBottom:4 }}>
                              {day}
                            </div>
                            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                              {Object.entries(tagMap).map(([tag, cnt]) => (
                                <span key={tag} style={{ fontSize:"0.62rem",
                                  color:TAG_C[tag]?.color||C.muted, fontFamily:"monospace" }}>
                                  {TAGS.find(t=>t.id===tag)?.label.split(" ")[0]} ×{cnt}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontFamily:"monospace", fontWeight:700,
                              fontSize:"0.95rem", color:C.text }}>
                              USD {fmtD(amt)}
                            </div>
                            <div style={{ fontSize:"0.65rem", color:C.muted, fontFamily:"monospace" }}>
                              {dayTxns.length} gasto{dayTxns.length!==1?"s":""}
                            </div>
                          </div>
                        </div>
                        <div style={{ height:4, background:C.surface, borderRadius:2 }}>
                          <div style={{ height:"100%", borderRadius:2,
                            width:`${(amt/maxAmt)*100}%`,
                            background: amt>250?C.over:amt>120?C.warn:C.under,
                            transition:"width .4s" }}/>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          );
        })()}

        {/* ─── BALANCE ─── */}
        {activeTab === "balance" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Cuadre */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"1rem", color:C.accent, marginBottom:14 }}>
                Cuadre de cuentas
              </div>
              {Math.abs(owes) < 0.5
                ? <div style={{ textAlign:"center", fontSize:"1rem", color:C.under,
                    fontFamily:"monospace", padding:"12px 0" }}>
                    🎉 ¡Están parejos!
                  </div>
                : <div style={{ background: owes>0?"rgba(110,198,176,.08)":"rgba(232,201,122,.08)",
                    border:`1px solid ${owes>0?"rgba(110,198,176,.2)":"rgba(232,201,122,.2)"}`,
                    borderRadius:8, padding:"14px 16px", fontFamily:"monospace",
                    fontSize:"0.85rem", lineHeight:1.8 }}>
                    {owes > 0
                      ? <><span style={{color:C.accent}}>Antonia</span> le debe <span style={{color:C.under,fontWeight:700}}>USD {fmtD(Math.abs(owes))}</span> a <span style={{color:C.accent}}>Felipe</span></>
                      : <><span style={{color:C.accent}}>Felipe</span> le debe <span style={{color:C.under,fontWeight:700}}>USD {fmtD(Math.abs(owes))}</span> a <span style={{color:C.accent}}>Antonia</span></>
                    }
                    <div style={{ fontSize:"0.68rem", color:C.muted, marginTop:4 }}>
                      considerando gastos 50/50
                    </div>
                  </div>
              }
            </div>

            {/* Por persona */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {PEOPLE.map(p => {
                const paid  = paidBy[p]  || 0;
                const spent = spentBy[p] || 0;
                const pct   = totalReal > 0 ? (paid/totalReal)*100 : 0;
                const pc    = PERSON_C[p];
                return (
                  <div key={p} style={{ background:C.card, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:16 }}>
                    <PersonChip name={p}/>
                    <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:7 }}>
                      {[["Pagó", paid], ["Consumió", spent]].map(([lbl, val]) => (
                        <div key={lbl} style={{ display:"flex", justifyContent:"space-between",
                          fontSize:"0.74rem", fontFamily:"monospace" }}>
                          <span style={{color:C.muted}}>{lbl}</span>
                          <span style={{color:C.text}}>USD {fmtD(val)}</span>
                        </div>
                      ))}
                      <div style={{ height:1, background:C.border }}/>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        fontSize:"0.76rem", fontFamily:"monospace" }}>
                        <span style={{color:C.muted}}>Neto</span>
                        <span style={{ color: paid-spent>=0?C.under:C.over, fontWeight:600 }}>
                          {paid-spent>=0?"+":""}{fmtD(paid-spent)}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop:10, height:5, background:C.surface, borderRadius:3 }}>
                      <div style={{ height:"100%", borderRadius:3, background:pc.color,
                        width:`${pct}%`, transition:"width .5s" }}/>
                    </div>
                    <div style={{ fontSize:"0.63rem", color:C.muted,
                      fontFamily:"monospace", marginTop:3 }}>
                      {pct.toFixed(0)}% del total
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gastos 50/50 */}
            {txns.filter(t=>t.split).length > 0 && (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
                <div style={{ fontFamily:"Georgia,serif", fontSize:"0.9rem",
                  color:C.muted, marginBottom:12 }}>Gastos compartidos</div>
                {txns.filter(t=>t.split).map(t => {
                  const usd = toUSD(t.amount, t.currency||"USD", rates);
                  return (
                    <div key={t.id} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", padding:"6px 0",
                      borderBottom:`1px solid ${C.border}`, gap:8, fontSize:"0.77rem" }}>
                      <span style={{color:C.muted,fontFamily:"monospace",fontSize:"0.67rem",flexShrink:0}}>{t.date}</span>
                      <span style={{flex:1}}>{t.desc}</span>
                      <PersonChip name={t.person}/>
                      <span style={{fontFamily:"monospace",fontWeight:600,flexShrink:0}}>USD {fmtD(usd)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── GRÁFICOS ─── */}
        {activeTab === "gráficos" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Avance */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"0.9rem",
                color:C.muted, marginBottom:12 }}>Avance global</div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.68rem",
                color:C.muted, fontFamily:"monospace", marginBottom:5 }}>
                <span>USD {fmtI(totalReal)}</span><span>USD 3.500</span>
              </div>
              <div style={{ height:12, background:C.surface, borderRadius:6 }}>
                <div style={{ height:"100%", borderRadius:6, transition:"width .6s",
                  width:`${progPct}%`,
                  background: progPct>100?C.over:progPct>80?C.warn:C.under }}/>
              </div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:8,
                fontSize:"0.67rem", fontFamily:"monospace", color:C.muted }}>
                <span>Planificado: <span style={{color:C.text}}>USD 3.500</span></span>
                <span>Restante: <span style={{color:slack>=0?C.under:C.over}}>
                  {slack>=0?"":"−"}USD {fmtI(Math.abs(slack))}</span></span>
                <span style={{color:C.text}}>{progPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Por sección */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"0.9rem",
                color:C.muted, marginBottom:12 }}>Planificado vs Real</div>
              {SECTIONS.map((sec,i) => {
                const maxV = Math.max(...SECTIONS.map(s2=>planByCat[s2.id]),1);
                const rPct = planByCat[sec.id]>0?(realByCat[sec.id]/planByCat[sec.id])*100:0;
                const cols = ["#e8c97a","#6ec6b0","#7a8099","#e87a7a","#a87adc","#7ab4e8","#e8a07a","#9aa0b8"];
                return (
                  <div key={sec.id} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      fontSize:"0.67rem", color:C.muted, fontFamily:"monospace", marginBottom:3 }}>
                      <span>{sec.icon} {sec.label}</span>
                      <span>{realByCat[sec.id]>0?`USD ${fmtI(realByCat[sec.id])}`:"–"}</span>
                    </div>
                    <div style={{ height:4, background:C.surface, borderRadius:2, marginBottom:2 }}>
                      <div style={{ height:"100%", borderRadius:2,
                        width:`${(planByCat[sec.id]/maxV)*100}%`,
                        background:"rgba(42,48,69,.9)" }}/>
                    </div>
                    <div style={{ height:4, background:C.surface, borderRadius:2 }}>
                      <div style={{ height:"100%", borderRadius:2, transition:"width .5s",
                        width:`${Math.min(rPct,100)}%`,
                        background: rPct>100?C.over:cols[i] }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Por tag */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"0.9rem",
                color:C.muted, marginBottom:12 }}>Por categoría</div>
              {(() => {
                const tagT = {};
                TAGS.forEach(t => { tagT[t.id] = 0; });
                txns.forEach(t => { tagT[t.tag] = (tagT[t.tag]||0) + toUSD(t.amount,t.currency||"USD",rates); });
                const maxT = Math.max(...Object.values(tagT), 1);
                return TAGS.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:8 }}>
                    <div style={{ fontSize:"0.69rem", color:C.muted, fontFamily:"monospace", width:115, flexShrink:0 }}>
                      {t.label}
                    </div>
                    <div style={{ flex:1, height:6, background:C.surface, borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", borderRadius:3, transition:"width .5s",
                        width:`${(tagT[t.id]/maxT)*100}%`,
                        background:TAG_C[t.id]?.color||C.muted }}/>
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:"0.68rem",
                      color:C.text, width:50, textAlign:"right" }}>
                      {fmtI(tagT[t.id])}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ─── NOTAS ─── */}
        {activeTab === "notas" && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`,
            borderRadius:10, padding:18 }}>
            <textarea
              defaultValue={localStorage.getItem("e26_notes")||""}
              onChange={e => localStorage.setItem("e26_notes", e.target.value)}
              placeholder="Confirmaciones de reserva, tips de ruta, pendientes, números…"
              style={{ width:"100%", minHeight:240, background:"transparent", border:"none",
                color:C.text, fontFamily:"inherit", fontSize:"0.88rem",
                lineHeight:1.7, outline:"none", resize:"none" }}
            />
            <div style={{ fontSize:"0.64rem", color:C.muted, fontFamily:"monospace", marginTop:6 }}>
              Solo en este dispositivo.
            </div>
          </div>
        )}
      </main>

      {/* ══ FAB ══ */}
      <button onClick={openModal}
        style={{ position:"fixed", bottom:"calc(22px + env(safe-area-inset-bottom,0px))",
          right:22, width:56, height:56, borderRadius:"50%",
          background:C.accent, color:C.bg, border:"none", fontSize:"1.7rem",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 24px rgba(232,201,122,.45)", zIndex:500,
          fontWeight:700, lineHeight:1, WebkitTapHighlightColor:"transparent" }}>
        +
      </button>

      {/* ══ MODAL ══ */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:600,
          display:"flex", alignItems:"flex-end", justifyContent:"center",
          padding:"0" }}
          onClick={e => { if(e.target===e.currentTarget){ setModal(false); setFormErr(""); } }}>
          <div style={{ background:C.card, borderRadius:"16px 16px 0 0",
            padding:"20px 18px calc(20px + env(safe-area-inset-bottom,0px))",
            width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto" }}>

            {/* Handle */}
            <div style={{ width:36, height:4, borderRadius:2, background:C.border,
              margin:"0 auto 18px" }}/>

            <div style={{ fontFamily:"Georgia,serif", fontSize:"1.05rem",
              color:C.accent, marginBottom:18 }}>
              {editingId ? "✏️ Editar gasto" : "➕ Nuevo gasto"}
            </div>

            {/* Fecha + Monto */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSt}>Fecha</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f=>({...f,date:e.target.value}))}
                  style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Monto</label>
                <div style={{ display:"flex", gap:6 }}>
                  <input ref={amountRef}
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={e => setForm(f=>({...f,amount:e.target.value}))}
                    placeholder="0.00"
                    style={{ ...inputSt, flex:1 }}
                    onKeyDown={e => { if(e.key==="Enter") submitForm(); }}/>
                  <select value={form.currency}
                    onChange={e => setForm(f=>({...f,currency:e.target.value}))}
                    style={{ ...selectSt, width:68, flexShrink:0, padding:"9px 5px" }}>
                    {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                </div>
                {form.currency !== "USD" && parseFloat(String(form.amount).replace(",",".")) > 0 && (
                  <div style={{ fontSize:"0.65rem", color:C.muted, fontFamily:"monospace", marginTop:3 }}>
                    ≈ USD {fmtD(toUSD(parseFloat(String(form.amount).replace(",","."))||0, form.currency, rates))}
                  </div>
                )}
              </div>
            </div>

            {/* Ítem */}
            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>Ítem del presupuesto</label>
              <select value={form.item} onChange={e => handleItemChange(e.target.value)} style={selectSt}>
                {SECTIONS.map(sec => (
                  <optgroup key={sec.id} label={`${sec.icon} ${sec.label}`}>
                    {ITEMS.filter(it=>it.cat===sec.id).map(it => (
                      <option key={it.key} value={it.key}>
                        {it.label} (plan USD {fmtD(it.plan)})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom:12 }}>
              <label style={labelSt}>Descripción</label>
              <input type="text" value={form.desc}
                onChange={e => setForm(f=>({...f,desc:e.target.value}))}
                placeholder="ej: cena en Positano, peaje A3…"
                style={inputSt}
                onKeyDown={e => { if(e.key==="Enter") submitForm(); }}/>
            </div>

            {/* Tag + Persona */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelSt}>Categoría</label>
                <select value={form.tag}
                  onChange={e => setForm(f=>({...f,tag:e.target.value}))} style={selectSt}>
                  {TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Pagado por</label>
                <div style={{ display:"flex", gap:8, height:38 }}>
                  {PEOPLE.map(p => (
                    <button key={p} onClick={() => setForm(f=>({...f,person:p}))} style={{
                      flex:1, border:`1px solid ${form.person===p?PERSON_C[p].color:C.border}`,
                      borderRadius:6, background: form.person===p?PERSON_C[p].bg:"transparent",
                      color: form.person===p?PERSON_C[p].color:C.muted,
                      fontFamily:"monospace", fontSize:"0.78rem", cursor:"pointer",
                      fontWeight: form.person===p?700:400,
                    }}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Split toggle */}
            <div style={{ marginBottom:20 }}>
              <Toggle
                value={form.split}
                onChange={() => setForm(f=>({...f,split:!f.split}))}
                label="Gasto compartido — dividir 50/50"
              />
            </div>

            {formErr && (
              <div style={{ color:C.over, fontSize:"0.75rem",
                marginBottom:12, fontFamily:"monospace" }}>{formErr}</div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setModal(false); setFormErr(""); setEditingId(null); }}
                style={{ flex:1, background:"transparent", color:C.muted,
                  border:`1px solid ${C.border}`, borderRadius:8,
                  padding:"11px 0", fontSize:"0.85rem", cursor:"pointer",
                  fontFamily:"monospace" }}>
                Cancelar
              </button>
              <button onClick={submitForm} disabled={saving}
                style={{ flex:2, background: saving ? C.muted : C.accent,
                  color:C.bg, border:"none", borderRadius:8,
                  padding:"11px 0", fontSize:"0.85rem", fontWeight:700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily:"monospace" }}>
                {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
