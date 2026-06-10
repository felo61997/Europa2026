import { TAG_C, TAGS, PERSON_C, C } from "./config";

export function Chip({ id }) {
  const tc  = TAG_C[id] || TAG_C.otro;
  const tag = TAGS.find(t => t.id === id);
  return (
    <span style={{ fontSize:"0.67rem", padding:"2px 8px", borderRadius:4,
      fontFamily:"monospace", background:tc.bg, color:tc.color,
      border:`1px solid ${tc.border}`, whiteSpace:"nowrap" }}>
      {tag?.label || id}
    </span>
  );
}

export function PersonChip({ name }) {
  const pc = PERSON_C[name] || { bg:"rgba(122,128,153,.14)", color:C.muted, border:"rgba(122,128,153,.3)" };
  return (
    <span style={{ fontSize:"0.67rem", padding:"2px 8px", borderRadius:4,
      fontFamily:"monospace", background:pc.bg, color:pc.color,
      border:`1px solid ${pc.border}`, whiteSpace:"nowrap" }}>
      {name}
    </span>
  );
}

export function DiffBadge({ real, plan }) {
  const diff = real - plan;
  const ok   = diff <= 0;
  return (
    <span style={{ fontSize:"0.71rem", padding:"2px 8px", borderRadius:4,
      fontFamily:"monospace", minWidth:68, display:"inline-block", textAlign:"right",
      background: ok ? "rgba(110,198,176,.1)" : "rgba(232,122,122,.1)",
      color: ok ? C.under : C.over }}>
      {ok ? "" : "+"}{Math.abs(diff).toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2})}
    </span>
  );
}

export function AlertBadge({ pct }) {
  if (pct < 80) return null;
  const over = pct >= 100;
  return (
    <span style={{ fontSize:"0.62rem", padding:"1px 6px", borderRadius:3,
      fontFamily:"monospace", marginLeft:7, whiteSpace:"nowrap",
      background: over ? "rgba(232,122,122,.15)" : "rgba(232,160,122,.15)",
      color: over ? C.over : C.warn,
      border:`1px solid ${over ? "rgba(232,122,122,.3)" : "rgba(232,160,122,.3)"}` }}>
      {over ? "⚠ EXCEDIDO" : `⚠ ${Math.round(pct)}%`}
    </span>
  );
}

export function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
      <div onClick={onChange}
        style={{ width:38, height:22, borderRadius:11, flexShrink:0, cursor:"pointer",
          background: value ? C.accent2 : C.border, position:"relative", transition:"background .2s" }}>
        <div style={{ position:"absolute", top:3, left: value ? 18 : 3,
          width:16, height:16, borderRadius:"50%", background:"white", transition:"left .2s" }}/>
      </div>
      <span style={{ fontSize:"0.77rem", color: value ? C.text : C.muted, fontFamily:"monospace" }}>
        {label}
      </span>
    </label>
  );
}
