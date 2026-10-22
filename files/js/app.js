// ===== Mesero Virtual: lógica de la interfaz del cliente =====
// Los datos de los restaurantes están en datos.js

// ===== AYUDAS GENERALES =====
// Dibujo en SVG para el Pan de Ajo (en vez de emoji)
function garlicSvg() {
  const sl = (y, dx) => {
    const sp = [[-18, -3], [-8, 3], [2, -4], [12, 2], [20, -2], [-2, 5], [-14, 4]].map(([a, b]) => `<circle cx="${60 + dx + a}" cy="${y + b}" r="1.7" fill="#3f8a3c"/>`).join("");
    return `<ellipse cx="${60 + dx}" cy="${y}" rx="35" ry="13" fill="#c0832f"/><ellipse cx="${60 + dx}" cy="${y - 1}" rx="31" ry="10.5" fill="#f2c872"/><ellipse cx="${60 + dx - 6}" cy="${y - 3}" rx="14" ry="3" fill="#fbe3a6" opacity=".8"/>${sp}`;
  };
  return `<svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pan de ajo y hierbas"><rect width="120" height="120" fill="#8a5a33"/><path d="M0 30H120M0 62H120M0 94H120" stroke="#74482a" stroke-width="1.5"/><g transform="rotate(-8 60 60)">${sl(26, -2)}${sl(54, 4)}${sl(82, -3)}</g><path d="M96 84c-9 4-13 14-9 21 3 5 14 5 18 0 5-8-1-17-9-21z" fill="#f6f1e6" stroke="#d8cfb8" stroke-width="1"/></svg>`;
}
const SV = { p203: garlicSvg() }, pic = (p) => `<div class="emo">${SV[p.id] || p.e}</div>`;

// Atajos: $ busca un elemento, M da formato de pesos
const $ = (s) => document.querySelector(s), M = (n) => "$" + n.toLocaleString("es-CO");

// Estado de la app: todo lo que cambia mientras el cliente usa la página
const S = { cat: "ALL", v: "qr", rid: null, sess: null, carts: {}, orders: [], plat: "android", n: 1041, oid: 0, closed: false, t: null, al: null };

// Orden de los estados del pedido y color de cada uno
const PATH = ["En espera", "En preparación", "Listo", "Entregado"], COL = { "Enviando": "--blue", "En espera": "--acc", "En preparación": "--blue", "Listo": "--ok", "Entregado": "--mut", "Cancelado": "--red", "Pago no confirmado": "--red" };

// sh abre la hoja inferior (modal), cl la cierra
const sh = (h) => {
  $("#shc").innerHTML = h;
  $("#sh").classList.remove("hide");
}, cl = () => $("#sh").classList.add("hide");
const R_ = (id) => R.find((r) => r.id === id), tag = (s) => `<span class="tag" style="color:var(${COL[s]})">${s}</span>`;

// Logo del robot mesero (versión clara y versión oscura, están en la carpeta img)
const logo = (h) => `<img class="lg l" alt="Mesero Virtual" style="height:${h}px" src="img/logo-claro.png"><img class="lg d" alt="" style="height:${h}px" src="img/logo-oscuro.png">`;

// ===== VALIDACIONES Y AVISOS =====
// esc evita que el texto del cliente se interprete como código HTML
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), MAXQ = 10, MAXOBS = 140;
let tt;

// Aviso temporal en la parte de arriba (verde = bien, rojo = error)
function toast(m, bad) {
  const e = $("#toast");
  e.textContent = m;
  e.className = "on" + (bad ? " bad" : "");
  clearTimeout(tt);
  tt = setTimeout(() => e.className = "", 2600);
}

// Muestra un error dentro de la hoja del producto
function err(m, sel) {
  const e = $("#er");
  if (e) {
    e.textContent = m;
    e.classList.remove("shake");
    void e.offsetWidth;
    e.classList.add("shake");
  } else toast(m, 1);
  const x = sel && $(sel);
  if (x) {
    x.closest("label").classList.add("inv");
    x.focus();
  }
  return false;
}

// ===== PANTALLAS DEL CLIENTE =====
// Texto de ingredientes quitados y observaciones de un producto
const lines = (l) => (l.rm || []).map((x) => `<div class="mut" style="color:var(--red);font-weight:800">SIN ${x.toLowerCase()}</div>`).join("") + (l.obs ? `<div class="mut">Obs.: ${esc(l.obs)}</div>` : "");

// Dibuja la pantalla según el estado actual
function render() {
  const A = $("#app");
  if (!S.sess) {
    A.innerHTML = welcome();
    return;
  }
  const act = S.orders.filter((o) => !["Entregado", "Cancelado"].includes(o.st)).length, c = S.carts[S.rid] || [], n = c.reduce((s, i) => s + i.q, 0);
  A.innerHTML = `<div class="top">${logo(38)}<div class="col"><b>Mesa 8</b><div class="mut">Sesión #${S.sess.n}</div></div><button class="btn alt" onclick="menu()" aria-label="Menú">⋯</button></div>` + (S.v === "orders" ? vOrders() : S.v === "menu" ? vMenu() : vRests()) + (S.v === "menu" && n ? `<button class="btn fab" onclick="cart(${S.rid})"><span>🛒 Carrito (${n})</span><b>${M(c.reduce((s, i) => s + i.p.$ * i.q, 0))}</b></button>` : "") + `<nav><button class="${S.v !== "orders" ? "on" : ""}" onclick="S.v='rests';render()"><span>🍽️</span>Restaurantes</button><button class="${S.v === "orders" ? "on" : ""}" onclick="S.v='orders';render()"><span>🧾</span>Mis pedidos${act ? `<i class="bd">${act}</i>` : ""}</button></nav>`;
}

// Pantalla inicial (simula escanear el QR)
function welcome() {
  return `<div style="text-align:center;padding-top:30px">${logo(150)}<h1>Mesero Virtual</h1>` + (S.closed ? `<div class="card"><h3>Sesión cerrada</h3><p class="mut">Los pedidos en curso se entregan con normalidad. Para pedir de nuevo, escanea el QR de tu mesa.</p></div>` : `<p class="mut">Pide desde tu mesa, sin descargar nada.</p>`) + `<button class="btn full" onclick="scan()">📷 Simular escaneo del QR · Mesa 8</button><p class="mut">Cada escaneo crea una sesión nueva.</p></div>`;
}

function scan() {
  S.sess = { n: ++S.n, seq: {} };
  S.v = "rests";
  S.closed = false;
  S.carts = {};
  S.orders = [];
  render();
}

// Lista de restaurantes
function vRests() {
  return `<h1>¿Qué se te antoja hoy?</h1><p class="mut">Cada restaurante tiene su propio carrito y su propio pedido.</p>` + R.map((r) => {
    const n = (S.carts[r.id] || []).reduce((s, i) => s + i.q, 0);
    return `<button class="card row" style="width:100%;text-align:left" onclick="S.rid=${r.id};S.cat='ALL';S.v='menu';render()"><div class="emo">${r.e}</div><div class="col"><h3>${r.n}</h3><div class="mut">${r.c}</div><div class="mut">${r.loc} · ⭐ ${r.r} · ⏱ ${r.tm}</div><div class="mut" style="margin-top:4px">${r.d}</div></div>${n ? `<span class="tag" style="color:var(--acc)">🛒 ${n}</span>` : '<b style="color:var(--acc)">›</b>'}</button>`;
  }).join("");
}

// Menú de un restaurante
function vMenu() {
  const r = R_(S.rid);
  return `<div class="row"><button class="btn alt" onclick="S.v='rests';render()" aria-label="Volver">←</button><h2>${r.n}</h2></div><div class="chips">${["ALL", ...new Set(r.P.map((p) => p.c))].map((c) => `<button class="chip ${c === S.cat ? "on" : ""}" onclick="S.cat='${c}';render()">${c === "ALL" ? "Todo" : c}</button>`).join("")}</div>` + r.P.filter((p) => S.cat === "ALL" || p.c === S.cat).map((p) => `<div class="card"><div class="row"><div class="emo">${pic(p).replace(/^<div class="emo">|<\/div>$/g, "")}</div><div class="col"><h3>${p.n}</h3><div class="mut">${p.d}</div><div class="mut" style="margin-top:2px">${p.al.length ? "⚠ " + p.al.join(" · ") : "Sin alérgenos declarados"}</div></div></div>
 <div class="row sp" style="margin-top:10px"><span class="price">${M(p.$)}</span>${p.x ? '<span class="tag" style="color:var(--mut)">Agotado</span>' : `<button class="btn" onclick="prod('${p.id}')">+ Agregar</button>`}</div></div>`).join("");
}

// ===== PRODUCTO Y CARRITO =====
// Abre la hoja del producto
function prod(id) {
  const p = R_(S.rid).P.find((x) => x.id === id);
  if (!p || p.x) return toast("Este producto está agotado.", 1);
  S.t = { p, q: 1, rm: [], obs: "" };
  ps();
}

function ps() {
  const { p, q, rm } = S.t;
  sh(`<div class="row sp"><h2>${p.e} ${p.n}</h2><button class="btn alt" onclick="cl()" aria-label="Cerrar">✕</button></div>
 <h3 style="margin-top:12px">Ingredientes</h3>` + (p.m === "q" ? p.i.map((x, k) => `<label class="row" style="min-height:40px"><input type="checkbox" ${rm.includes(x) ? "" : "checked"} onchange="tg(${k},this.checked)"> ${x}</label>`).join("") + `<div class="mut">Desmarca lo que no quieras.</div>` : `<p class="mut">${p.i.join(" · ")}</p>`) + `<div class="al"><b>⚠ Alérgenos:</b> ${p.al.length ? p.al.join(", ") : "ninguno declarado"}.<br>Si tienes una alergia grave, confírmala con el restaurante.</div>` + (p.al.length ? `<label class="row ack"><input type="checkbox" id="ack" ${S.t.ack ? "checked" : ""} onchange="S.t.ack=this.checked;this.closest('label').classList.remove('inv');$('#er').textContent=''"> Leí los alérgenos y sé que debo confirmar con el restaurante si tengo una alergia grave.</label>` : "") + (p.m !== "n" ? `<h3>Observaciones</h3><textarea maxlength="140" placeholder="Alergias, restricciones o peticiones especiales" oninput="S.t.obs=this.value;$('#cnt').textContent=this.value.length+'/140'">${esc(S.t.obs)}</textarea><div class="mut" id="cnt" style="text-align:right">${S.t.obs.length}/140</div>` : "") + `<div id="er" class="err" role="alert"></div><div class="row sp" style="margin-top:12px"><div class="qty"><button onclick="qd(-1)" aria-label="Menos">−</button><b>${q}</b><button onclick="qd(1)" aria-label="Más">+</button></div><button class="btn col" onclick="addC()">Agregar · ${M(p.$ * q)}</button></div>`);
}

// Cambia la cantidad (máximo 10)
function qd(d) {
  if (d > 0 && S.t.q >= MAXQ) return err("Máximo " + MAXQ + " unidades por producto.");
  S.t.q = Math.max(1, S.t.q + d);
  ps();
}

function tg(k, on) {
  const x = S.t.p.i[k];
  S.t.rm = on ? S.t.rm.filter((y) => y !== x) : [...S.t.rm, x];
}

// Agrega al carrito, validando antes cada regla
function addC() {
  const t = S.t, p = t.p;
  if (!S.sess || S.closed) {
    cl();
    return toast("Tu sesión está cerrada. Escanea el QR de nuevo.", 1);
  }
  if (p.x) return err("Este producto está agotado.");
  if (p.m === "q" && t.rm.length >= p.i.length) return err("Deja al menos un ingrediente en el producto.");
  const o = (t.obs || "").replace(/\s+/g, " ").trim();
  if (/[<>]/.test(o)) return err("Las observaciones no pueden incluir los símbolos < o >.");
  if (o.length > MAXOBS) return err("Las observaciones superan los " + MAXOBS + " caracteres.");
  if (p.al.length && !t.ack) return err("Confirma que leíste los alérgenos para continuar.", "#ack");
  (S.carts[S.rid] = S.carts[S.rid] || []).push({ ...t, obs: o });
  cl();
  render();
  toast("Agregado al carrito ✓");
}

// Carrito de un restaurante
function cart(rid) {
  const c = S.carts[rid] || [];
  if (!c.length) {
    cl();
    toast("Tu carrito está vacío.", 1);
    return;
  }
  const tot = c.reduce((s, i) => s + i.p.$ * i.q, 0);
  sh(`<div class="row sp"><h2>Carrito · ${R_(rid).n}</h2><button class="btn alt" onclick="cl()" aria-label="Cerrar">✕</button></div>` + c.map((l, k) => `<div class="card row sp"><div class="col"><h3>${l.p.n}</h3>${lines(l)}<span class="price">${M(l.p.$ * l.q)}</span></div><div class="qty"><button onclick="cq(${rid},${k},-1)" aria-label="Menos">−</button><b>${l.q}</b><button onclick="cq(${rid},${k},1)" aria-label="Más">+</button></div></div>`).join("") + `<div class="row sp" style="margin-top:12px"><span class="mut">Entrega en Mesa 8</span><h2>${M(tot)}</h2></div><button class="btn full" onclick="pay(${rid},${tot})">Enviar a pagar</button>`);
}

function cq(rid, k, d) {
  const c = S.carts[rid];
  if (!c || !c[k]) return;
  if (d > 0 && c[k].q >= MAXQ) return toast("Máximo " + MAXQ + " unidades por producto.", 1);
  c[k].q += d;
  if (c[k].q <= 0) c.splice(k, 1);
  render();
  cart(rid);
}

// Pantalla de pago simulado
function pay(rid, tot) {
  sh(`<h2>Pago simulado</h2><p class="mut">Aquí irá el pago real. Por ahora, confirma la simulación para enviar tu pedido a ${R_(rid).n}.</p><div class="row sp"><span>Total</span><h2>${M(tot)}</h2></div><button id="pb" class="btn full" onclick="place(${rid})">Confirmar pago (simulado)</button><button class="btn alt full" onclick="cart(${rid})">Volver al carrito</button>`);
}

// Envía el pedido (bloquea el doble toque)
function place(rid) {
  if (S.busy) return;
  if (!S.sess || S.closed) {
    cl();
    return toast("Tu sesión está cerrada. Escanea el QR de nuevo.", 1);
  }
  if (!(S.carts[rid] || []).length) {
    cl();
    return toast("Tu carrito está vacío o el pedido ya se envió.", 1);
  }
  S.busy = 1;
  const bt = $("#pb");
  if (bt) {
    bt.disabled = true;
    bt.textContent = "Enviando…";
  }
  setTimeout(() => {
    S.busy = 0;
    const c = S.carts[rid] || [];
    if (!S.sess || !c.length) return;
    const total = c.reduce((s, i) => s + i.p.$ * i.q, 0), q = S.sess.seq[rid] = (S.sess.seq[rid] || 0) + 1, o = { id: ++S.oid, rid, no: `${S.sess.n}-R${rid}-${String(q).padStart(2, "0")}`, items: c, total, st: "Enviando", t0: 0, al: false };
    S.orders.push(o);
    S.carts[rid] = [];
    S.v = "orders";
    cl();
    render();
    toast("Pedido enviado ✓");
  }, 700);
}

// ===== PEDIDOS =====
// Tiempo estimado: tiempo del restaurante + pedidos por delante
const est = (o) => {
  const a = R_(o.rid).t + S.orders.filter((x) => x.rid === o.rid && x.id < o.id && ["En espera", "En preparación"].includes(x.st)).length * 4;
  return `${a}–${a + 4} min`;
};

// Lista "Mis pedidos"
function vOrders() {
  const L = [...S.orders].reverse(), live = S.orders.some((o) => !["Entregado", "Cancelado"].includes(o.st));
  return `<h1>Mis pedidos</h1><p class="mut">Sesión #${S.sess.n} · cada restaurante tiene su pedido.</p>` + (S.plat === "ios" && live ? `<div class="note">🍎 Apple no permite enviar avisos sin instalar una app. Mantén esta página abierta y revisa el cronómetro; también verás tu pedido en la pantalla del restaurante.</div>` : "") + (L.length ? L.map((o) => {
    const i = PATH.indexOf(o.st), w = ["En espera", "En preparación"].includes(o.st);
    return `<div class="card"><div class="row sp"><h3>#${o.no}</h3>${tag(o.st)}</div><div class="mut">${R_(o.rid).n} · ${M(o.total)}</div>
 <div style="margin-top:6px">${o.items.map((l) => `<div>${l.q}× ${l.p.n}${lines(l)}</div>`).join("")}</div>` + (i >= 0 ? `<div class="steps">${PATH.map((s, k) => `<div class="stp ${k <= i ? "on" : ""}"><i></i>${s}</div>`).join("")}</div>` : "") + (w ? `<div class="row sp"><span class="mut">Tiempo estimado: <b style="color:var(--tx)">${est(o)}</b></span><span class="mut">⏱ <b data-t="${o.t0}">0:00</b></span></div>` : "") + (o.st === "Enviando" ? `<div class="mut">Esperando el comprobante de pago…</div><button class="btn demo full" onclick="adv(${o.id})">▶ Demo: llega el comprobante</button><button class="btn demo full" onclick="nopay(${o.id})">▶ Demo: pasan 5 min sin comprobante</button>` : "") + (o.st === "Pago no confirmado" ? `<div class="note">No pudimos confirmar el pago. Puedes reintentar sin duplicar el pedido.</div><button class="btn full" onclick="retry(${o.id})">Reintentar pago</button>` : "") + (o.st === "En espera" ? `<button class="btn alt full" onclick="cancel(${o.id})">Cancelar pedido</button>` : "") + (o.st === "Cancelado" ? `<div class="mut">Reembolso pendiente.</div>` : "") + (o.st === "Listo" ? `<div class="note" style="border-color:var(--ok)">✅ ¡Tu pedido está listo! Pasa por él al restaurante.</div>` : "") + (S.plat === "android" && (w || o.st === "Enviando") ? `<button class="btn ${o.al ? "ok" : "alt"} full" onclick="o_al(${o.id})">${o.al ? "🔔 Aviso activado (se repite 2–3 veces, cada 30 s)" : "🔔 Avísame cuando esté listo"}</button>` : "") + (w || o.st === "Listo" ? `<button class="btn demo full" onclick="adv(${o.id})">▶ Demo: ${o.st === "En espera" ? "cocina inicia producción" : o.st === "En preparación" ? "cocina termina el pedido" : "mostrador entrega"}</button>` : "") + `</div>`;
  }).join("") : `<div class="card" style="text-align:center"><div style="font-size:40px">🧾</div><p class="mut">Aún no tienes pedidos en esta sesión.</p></div>`);
}
const ord = (id) => S.orders.find((o) => o.id === id);

// Avanza el estado del pedido (botones Demo que hacen de cocina)
function adv(id) {
  const o = ord(id);
  if (!o || ["Entregado", "Cancelado", "Pago no confirmado"].includes(o.st)) return;
  if (o.st === "Enviando") {
    o.st = "En espera";
    o.t0 = Date.now();
  } else {
    o.st = PATH[PATH.indexOf(o.st) + 1];
    if (o.st === "Listo") ring(o);
  }
  render();
}

function nopay(id) {
  if (ord(id).st !== "Enviando") return;
  ord(id).st = "Pago no confirmado";
  render();
}

function retry(id) {
  const o = ord(id);
  if (o.st !== "Pago no confirmado") return;
  o.st = "Enviando";
  render();
}

// Cancelación: solo permitida en "En espera"
function doCancel(id) {
  const o = ord(id);
  cl();
  if (o.st !== "En espera") return toast("Ya no puedes cancelar: cocina inició la producción.", 1);
  o.st = "Cancelado";
  render();
  toast("Pedido cancelado");
}

function cancel(id) {
  if (ord(id).st !== "En espera") return toast("Ya no puedes cancelar: cocina inició la producción.", 1);
  sh(`<h2>¿Cancelar el pedido?</h2><p class="mut">Solo puedes cancelar antes de que cocina inicie la producción.</p><button class="btn red full" onclick="doCancel(${id})">Sí, cancelar</button><button class="btn alt full" onclick="cl()">No, mantenerlo</button>`);
}

function o_al(id) {
  const o = ord(id);
  o.al = !o.al;
  render();
}

// ===== ALARMA Y SESIÓN =====
// Alarma "din, din, din"
function beep() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)(), g = c.createGain();
    g.connect(c.destination);
    [0, 0.25, 0.5].forEach((d) => {
      const x = c.createOscillator();
      x.frequency.value = 1100;
      x.connect(g);
      g.gain.setValueAtTime(0.25, c.currentTime + d);
      g.gain.setValueAtTime(0, c.currentTime + d + 0.15);
      x.start(c.currentTime + d);
      x.stop(c.currentTime + d + 0.16);
    });
  } catch (e) {
  }
}

function ring(o) {
  const go = () => {
    beep();
    if (S.plat === "android" && navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };
  go();
  clearInterval(S.al);
  S.al = setInterval(go, 1800);
  sh(`<div class="ring">🔔</div><h2 style="text-align:center">¡Tu pedido #${o.no} está listo!</h2><p class="mut" style="text-align:center">${R_(o.rid).n} · pasa por él mientras está caliente.</p><button class="btn ok full" onclick="stop()">Entendido, ya voy por él</button>`);
}

function stop() {
  clearInterval(S.al);
  cl();
}

// Menú de la sesión, aviso de inactividad y cierre
function menu() {
  sh(`<div class="row sp"><h2>Mesa 8 · Sesión #${S.sess.n}</h2><button class="btn alt" onclick="cl()" aria-label="Cerrar">✕</button></div>
 <h3 style="margin-top:12px">Tu teléfono (demo)</h3><div class="row" style="margin-top:8px"><button class="chip ${S.plat === "android" ? "on" : ""}" onclick="S.plat='android';render();menu()">Android</button><button class="chip ${S.plat === "ios" ? "on" : ""}" onclick="S.plat='ios';render();menu()">iPhone</button></div>
 <button class="btn demo full" onclick="idle()">▶ Demo: 50 min sin actividad</button><button class="btn red full" onclick="end()">Terminé</button>`);
}

function idle() {
  sh(`<h2>¿Sigues ahí?</h2><p class="mut">Por inactividad, tu sesión se cerrará en 10 minutos. Los pedidos en curso no se cancelan.</p><button class="btn full" onclick="cl()">Sigo aquí</button><button class="btn alt full" onclick="end()">Terminé</button>`);
}

function end() {
  sh(`<h2>¿Cerrar la sesión?</h2><p class="mut">Los pedidos en curso se entregan con normalidad, pero no podrás pedir más. Para pedir de nuevo tendrás que escanear el QR.</p><button class="btn red full" onclick="S.sess=null;S.closed=true;cl();render()">Sí, terminé</button><button class="btn alt full" onclick="cl()">Volver</button>`);
}

// Cronómetro de cada pedido (se actualiza cada segundo)
setInterval(() => document.querySelectorAll("[data-t]").forEach((e) => {
  const s = Math.max(0, Math.floor((Date.now() - e.dataset.t) / 1000));
  e.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}), 1000);

render();

