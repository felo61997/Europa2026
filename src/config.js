// ─── REEMPLAZA ESTOS VALORES CON LOS DE TU FIREBASE ───────────────────────
// (los obtienes en el paso 3 de la guía)
export const firebaseConfig = {
  apiKey:            "AIzaSyAPvcUkYAASx8z0hVdgK8UNB81FxnShxuQ",
  authDomain:        "europa-2026-9e5a2.firebaseapp.com",
  projectId:         "europa-2026-9e5a2",
  storageBucket:     "europa-2026-9e5a2.firebasestorage.app",
  messagingSenderId: "484523798396",
  appId:             "1:484523798396:web:bad15763b3de759be2fef9"
};

// ─── DATOS DEL VIAJE ───────────────────────────────────────────────────────
export const BUDGET  = 3500;
export const PEOPLE  = ["Felipe", "Antonia"];

export const CURRENCIES = [
  { id:"USD", label:"USD $" },
  { id:"EUR", label:"EUR €" },
  { id:"CLP", label:"CLP $" },
];

export const TAGS = [
  { id:"alojamiento", label:"🏨 Alojamiento" },
  { id:"comida",      label:"🍽 Comida"       },
  { id:"transporte",  label:"🚌 Transporte"   },
  { id:"actividad",   label:"🎫 Actividad"    },
  { id:"compra",      label:"🛍 Compra"       },
  { id:"fiesta",      label:"🎉 Fiesta"       },
  { id:"combustible", label:"⛽ Combustible"  },
  { id:"otro",        label:"📌 Otro"         },
];

export const ITEMS = [
  { key:"v0",  cat:"vuelos",     label:"SCL → MAD (Iberia IB114)",     plan:214.30 },
  { key:"v1",  cat:"vuelos",     label:"MAD → BRI (ITA Airways)",      plan:178.02 },
  { key:"v2",  cat:"vuelos",     label:"CDG → BCN (Air France AF1448)", plan:157.10 },
  { key:"v3",  cat:"vuelos",     label:"BCN → MAD → SCL (Iberia)",     plan:283.04 },
  { key:"t0",  cat:"transporte", label:"Taxi/Uber casa → SCL",         plan:30 },
  { key:"t1",  cat:"transporte", label:"Taxi/Uber BCN → casa",         plan:30 },
  { key:"t2",  cat:"transporte", label:"Metro Madrid",                 plan:20 },
  { key:"m0",  cat:"madrid",     label:"Hotel Madrid (1 noche)",       plan:90 },
  { key:"m1",  cat:"madrid",     label:"Comidas Madrid",               plan:46 },
  { key:"m2",  cat:"madrid",     label:"Transporte local Madrid",      plan:10 },
  { key:"b0",  cat:"bari",       label:"Hotel Bari (1 noche)",         plan:80 },
  { key:"b1",  cat:"bari",       label:"Cena Bari Vecchia",            plan:35 },
  { key:"c0",  cat:"camper",     label:"Relocation camper (€108)",     plan:124.20 },
  { key:"c1",  cat:"camper",     label:"Combustible (€323)",           plan:371.45 },
  { key:"c2",  cat:"camper",     label:"Peajes (€150)",                plan:172.50 },
  { key:"c3",  cat:"camper",     label:"Transporte público (€110)",    plan:126.50 },
  { key:"c4",  cat:"camper",     label:"Campings y estacionamientos",  plan:115 },
  { key:"c5",  cat:"camper",     label:"Alimentación camper (€270)",   plan:310.50 },
  { key:"p0",  cat:"paris",      label:"Hotel París (1 noche)",        plan:126 },
  { key:"p1",  cat:"paris",      label:"Transporte París",             plan:21 },
  { key:"p2",  cat:"paris",      label:"Comidas París",                plan:69 },
  { key:"p3",  cat:"paris",      label:"Actividades París",            plan:35 },
  { key:"ba0", cat:"barcelona",  label:"Transporte Barcelona",         plan:46 },
  { key:"ba1", cat:"barcelona",  label:"Comidas Barcelona",            plan:207 },
  { key:"ba2", cat:"barcelona",  label:"Fiesta nocturna",              plan:230 },
  { key:"ba3", cat:"barcelona",  label:"Paseos y actividades BCN",     plan:57 },
  { key:"o0",  cat:"otros",      label:"Imprevistos / sin categoría",  plan:316 },
];

export const SECTIONS = [
  { id:"vuelos",     icon:"✈️",  label:"Vuelos" },
  { id:"transporte", icon:"🚌", label:"Transporte" },
  { id:"madrid",     icon:"🇪🇸", label:"Madrid" },
  { id:"bari",       icon:"🇮🇹", label:"Bari" },
  { id:"camper",     icon:"🚐", label:"Ruta Camper" },
  { id:"paris",      icon:"🇫🇷", label:"París" },
  { id:"barcelona",  icon:"🇪🇸", label:"Barcelona" },
  { id:"otros",      icon:"🎲", label:"Otros" },
];

export const AUTO_TAGS = {
  v0:"transporte", v1:"transporte", v2:"transporte", v3:"transporte",
  t0:"transporte", t1:"transporte", t2:"transporte",
  m0:"alojamiento", b0:"alojamiento", p0:"alojamiento", c4:"alojamiento",
  m1:"comida", b1:"comida", p2:"comida", ba1:"comida", c5:"comida",
  c1:"combustible", p3:"actividad", ba3:"actividad", ba2:"fiesta",
};

export const TAG_C = {
  alojamiento:{ bg:"rgba(122,180,232,.14)", color:"#7ab4e8", border:"rgba(122,180,232,.3)" },
  comida:     { bg:"rgba(232,160,122,.14)", color:"#e8a07a", border:"rgba(232,160,122,.3)" },
  transporte: { bg:"rgba(168,122,220,.14)", color:"#a87adc", border:"rgba(168,122,220,.3)" },
  actividad:  { bg:"rgba(110,198,176,.14)", color:"#6ec6b0", border:"rgba(110,198,176,.3)" },
  compra:     { bg:"rgba(232,201,122,.14)", color:"#e8c97a", border:"rgba(232,201,122,.3)" },
  fiesta:     { bg:"rgba(232,122,122,.14)", color:"#e87a7a", border:"rgba(232,122,122,.3)" },
  combustible:{ bg:"rgba(122,128,153,.14)", color:"#9aa0b8", border:"rgba(122,128,153,.3)" },
  otro:       { bg:"rgba(122,128,153,.14)", color:"#9aa0b8", border:"rgba(122,128,153,.3)" },
};

export const PERSON_C = {
  Felipe: { bg:"rgba(232,201,122,.14)", color:"#e8c97a", border:"rgba(232,201,122,.3)" },
  Antonia:{ bg:"rgba(110,198,176,.14)", color:"#6ec6b0", border:"rgba(110,198,176,.3)" },
};

export const C = {
  bg:"#0f1117", surface:"#181c27", card:"#1e2333", border:"#2a3045",
  accent:"#e8c97a", accent2:"#6ec6b0", text:"#e8e6df", muted:"#7a8099",
  over:"#e87a7a", under:"#6ec6b0", warn:"#e8a07a",
};
