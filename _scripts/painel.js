'use strict';
/* Painel da chapa estadual do PODE/SC – aplicação (sem dependências externas).
   Dados: A (automáticos, 02_painel_dados.pl) e M (transcritos dos relatórios, dados_manuais.js). */

// ============================================================ utilidades
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, at, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(at || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') e.innerHTML = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k === 'tip') bindTip(e, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  add(e, kids); return e;
}
function s(tag, at, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(at || {})) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k === 'tip') bindTip(e, v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  add(e, kids); return e;
}
function add(e, kids) { for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; e.append(k instanceof Node ? k : document.createTextNode(String(k))); } return e; }
const NF = (d = 0) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const n0 = v => v == null ? '—' : NF(0).format(v);
const n1 = v => v == null ? '—' : NF(1).format(v);
const brl = (v, d = 2) => v == null ? '—' : 'R$ ' + NF(d).format(v);
const brlK = v => v == null ? '—' : v >= 1e6 ? 'R$ ' + NF(1).format(v / 1e6) + ' mi' : v >= 1e4 ? 'R$ ' + NF(1).format(v / 1e3) + ' mil' : brl(v);
const pct = (v, d = 1) => v == null ? '—' : NF(d).format(v) + '%';
const ms = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const dm = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '—';
const dmy = iso => iso ? dm(iso) + '/' + iso.slice(0, 4) : '—';
const norm = t => (t || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const chaveMun = t => norm(t).toUpperCase().replace(/[^A-Z0-9]/g, '');
const PEQ = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const tc = t => (t || '').toLowerCase().split(/(\s+|-)/).map((w, i) => PEQ.has(w) && i ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('').replace(/\bDr\b/, 'Dr.');
function mix(a, b, t) { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); const A_ = p(a), B = p(b); return '#' + A_.map((x, i) => Math.round(x + (B[i] - x) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join(''); }
function escala(v, max) { if (!v) return '#F1F4F3'; const t = Math.sqrt(v / max); return t < .5 ? mix('#CCE1DC', '#006851', t * 2) : mix('#006851', '#0D251A', (t - .5) * 2); }
const COR = { verde: '#006851', menta: '#00A170', cinza: '#AEADB3', tinta: '#0C5844', floresta: '#0D251A', fio: '#C8D5CF', t1: '#E6F0EE', t2: '#CCE1DC', t3: '#E6F6F1', texto: '#3D4A44' };
const CAT = {
  pf: ['Pessoas físicas (militância)', '#006851'], legado: ['Legado Consultoria', '#0D251A'], redes: ['Redes e mídia digital', '#00A170'],
  impuls: ['Impulsionamento', '#7FD0B5'], material: ['Material, jingle, jornal, correios', '#AEADB3'], repasse: ['Repasse a candidato', '#0C5844'],
  outros: ['Outras declaradas', '#C8D5CF'], tarifa: ['Tarifas', '#DDE5E2'], omitido: ['Fora da PCE (extrato)', '#5B6B65'],
};

// tooltip
const TIP = () => $('#tip');
function bindTip(el, html) {
  el.addEventListener('mouseenter', () => { const t = TIP(); t.innerHTML = typeof html === 'function' ? html() : html; t.style.display = 'block'; });
  el.addEventListener('mousemove', ev => { const t = TIP(); const w = t.offsetWidth, hh = t.offsetHeight; let x = ev.clientX + 14, y = ev.clientY + 14; if (x + w > innerWidth - 8) x = ev.clientX - w - 14; if (y + hh > innerHeight - 8) y = ev.clientY - hh - 14; t.style.left = x + 'px'; t.style.top = y + 'px'; });
  el.addEventListener('mouseleave', () => { TIP().style.display = 'none'; });
}
const mem = { get(k) { try { return localStorage.getItem('painel-pode-sc:' + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem('painel-pode-sc:' + k, v); } catch (e) { } } };

// ============================================================ dados derivados
const MET = Object.fromEntries(A.metricas.map(m => [String(m.nr), m]));
const NOMEMUN = Object.fromEntries(A.mapa.mun.map(m => [m.c, m.n]));
const MULHERES = A.metricas.filter(m => m.sexo === 'F').sort((a, b) => a.votos - b.votos);
function nome(nr) { nr = String(nr); return (M.cand[nr] && M.cand[nr].urna) || (A.cand[nr] && tc(A.cand[nr].urna)) || nr; }
function foto(nr, cls = '') {
  const src = A.fotos[String(nr)];
  const d = h('div', { class: 'foto ' + cls });
  if (src) d.append(h('img', { src, alt: 'Foto de urna – ' + nome(nr), loading: 'lazy' }));
  else d.textContent = nome(nr).split(/\s+/).filter(w => /^[A-ZÀ-Ú]/.test(w)).slice(0, 2).map(w => w[0]).join('');
  return d;
}
const TIPOS = { alvo: 'Grupo-alvo', reserva: 'Reserva', contraponto: 'Contraponto', fora: 'Fora do alvo', federal: 'Federal · Legado', dirigente: 'Direção estadual' };
function badge(tipo) { return h('span', { class: 'badge ' + tipo }, TIPOS[tipo] || tipo); }
function fonte(t) { return h('div', { class: 'fonte' }, t); }
function cab(el, nn, tit, sub) { el.append(h('div', { class: 'pg-cab' }, h('div', { class: 'nn' }, nn), h('div', {}, h('h2', {}, tit), sub ? h('p', {}, sub) : null))); }
function kpi(v, l, cls = '') { return h('div', { class: 'c kpi ' + cls }, h('div', { class: 'v' + (cls.includes('menta') ? ' menta' : '') }, v), h('div', { class: 'l' }, l)); }
function lista(itens, cls = 'lista') { return h('ul', { class: cls }, itens.map(i => h('li', { html: i }))); }
function tabela(cols, linhas, opt = {}) {
  // cols: [[título, classe, ordenável?]] ; linhas: [[células], {cls, on}]
  const tb = h('tbody');
  const tab = h('table', { class: 't' }, h('thead', {}, h('tr', {}, cols.map((c, i) => h('th', { class: (c[1] || '') + (c[2] ? ' sort' : ''), on: c[2] ? { click: () => ordena(i, c[1] === 'r') } : null }, c[0])))), tb);
  let dados = linhas.slice(), dir = 1, col = -1;
  function desenha() { tb.innerHTML = ''; for (const l of dados) { const [cel, o] = Array.isArray(l[0]) ? l : [l, {}]; tb.append(h('tr', { class: (o.cls || '') + (o.on ? ' click' : ''), on: o.on ? { click: o.on } : null }, cel.map((x, i) => h('td', { class: cols[i][1] || '' }, x)))); } }
  function ordena(i, numerico) { dir = col === i ? -dir : (numerico ? -1 : 1); col = i; dados.sort((a, b) => { const va = (Array.isArray(a[0]) ? a[0] : a)[i], vb = (Array.isArray(b[0]) ? b[0] : b)[i]; const ka = va && va.dataset ? va.dataset.k : va, kb = vb && vb.dataset ? vb.dataset.k : vb; return (numerico ? (parseFloat(ka) - parseFloat(kb)) : String(ka).localeCompare(String(kb), 'pt')) * dir; }); desenha(); }
  desenha();
  if (opt.foot) tab.append(h('tfoot', {}, h('tr', {}, opt.foot.map((x, i) => h('td', { class: cols[i][1] || '' }, x)))));
  return h('div', { class: 'tw' }, tab);
}
const nk = (txt, k) => h('span', { 'data-k': k }, txt); // célula com chave de ordenação

// ============================================================ gráficos
function eixoLog(min, max) { const t = []; for (let p = 1; p <= 1e7; p *= 10) for (const m of [1, 3]) { const v = p * m; if (v >= min && v <= max) t.push(v); } return t; }
function linear(d0, d1, r0, r1) { const f = v => r0 + (v - d0) / (d1 - d0 || 1) * (r1 - r0); return f; }
function logS(d0, d1, r0, r1) { const a = Math.log10(d0), b = Math.log10(d1); return v => r0 + (Math.log10(Math.max(v, d0)) - a) / (b - a) * (r1 - r0); }

function barrasH(itens, o = {}) {
  const w = o.w || 640, lw = o.lw || 200, lh = o.lh || 26, pad = 6, max = o.max || Math.max(...itens.map(i => i.v), 1);
  const H = itens.length * lh + (o.eixo ? 22 : 4);
  const x = linear(0, max, lw, w - (o.rw || 90));
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': o.titulo || 'gráfico de barras' });
  if (o.linha != null) g.append(s('line', { x1: x(o.linha), x2: x(o.linha), y1: 0, y2: H - (o.eixo ? 22 : 0), stroke: COR.floresta, 'stroke-dasharray': '4 3' }), s("text", { x: x(o.linha) + 4, y: H - (o.eixo ? 22 : 0) - 2, 'font-size': 10.5, fill: COR.floresta, text: o.linhaTxt || '' }));
  itens.forEach((it, i) => {
    const y = i * lh;
    g.append(s('text', { x: lw - 8, y: y + lh / 2 + 4, 'text-anchor': 'end', 'font-size': 12, 'font-weight': it.forte ? 600 : 400, fill: it.forte ? COR.tinta : COR.texto, text: it.label }));
    if (it.fundo != null) g.append(s('rect', { x: lw, y: y + pad / 2, width: Math.max(0, x(it.fundo) - lw), height: lh - pad, rx: 3, fill: COR.t1 }));
    const r = s('rect', { x: lw, y: y + pad / 2, width: Math.max(1, x(it.v) - lw), height: lh - pad, rx: 3, fill: it.cor || COR.verde, tip: it.tip || null });
    if (it.on) { r.style.cursor = 'pointer'; r.addEventListener('click', it.on); }
    g.append(r, s('text', { x: x(Math.max(it.v, it.fundo || 0)) + 6, y: y + lh / 2 + 4, 'font-size': 11.5, fill: COR.texto, text: it.txt != null ? it.txt : n0(it.v) }));
  });
  return g;
}

function dispersao(pts, o) {
  const w = o.w || 640, H = o.h || 420, m = { l: 62, r: 20, t: 16, b: 46 };
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const xd = o.xd || [Math.min(...xs), Math.max(...xs)], yd = o.yd || [Math.min(...ys), Math.max(...ys)];
  const X = (o.xlog ? logS : linear)(xd[0], xd[1], m.l, w - m.r), Y = (o.ylog ? logS : linear)(yd[0], yd[1], H - m.b, m.t);
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': o.titulo || 'dispersão' });
  const xt = o.xticks || (o.xlog ? eixoLog(xd[0], xd[1]) : null), yt = o.yticks || (o.ylog ? eixoLog(yd[0], yd[1]) : null);
  const gr = s('g', { class: 'grade' });
  (xt || []).forEach(v => gr.append(s('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b })));
  (yt || []).forEach(v => gr.append(s('line', { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v) })));
  g.append(gr);
  const ex = s('g', { class: 'eixo' });
  (xt || []).forEach(v => ex.append(s('text', { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle', text: (o.xfmt || n0)(v) })));
  (yt || []).forEach(v => ex.append(s('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', text: (o.yfmt || n0)(v) })));
  ex.append(s('text', { x: (m.l + w - m.r) / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, fill: COR.tinta, text: o.xlab || '' }));
  ex.append(s('text', { x: 14, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})`, 'font-size': 12, fill: COR.tinta, text: o.ylab || '' }));
  g.append(ex);
  (o.extra || []).forEach(f => f(g, X, Y, m, w, H));
  const lab = s('g');
  pts.sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(p => {
    const c = s('circle', { cx: X(p.x), cy: Y(p.y), r: p.r || 6, fill: p.cor, stroke: p.borda || '#fff', 'stroke-width': p.borda ? 2.5 : 1, tip: p.tip, opacity: p.op || 1 });
    if (p.on) { c.style.cursor = 'pointer'; c.addEventListener('click', p.on); }
    g.append(c);
    if (p.label) lab.append(s('text', { x: X(p.x) + (p.dx || 9), y: Y(p.y) + (p.dy || 4), 'font-size': 11.5, 'font-weight': 500, fill: COR.tinta, 'text-anchor': p.anchor || 'start', text: p.label, style: 'paint-order:stroke;stroke:#fff;stroke-width:3px' }));
  });
  g.append(lab);
  return g;
}

function rosca(partes, o = {}) {
  const S = o.s || 200, r = S / 2 - 6, ri = r * .6, tot = partes.reduce((t, p) => t + p.v, 0);
  const g = s('svg', { viewBox: `0 0 ${S} ${S}`, role: 'img', 'aria-label': 'composição da despesa' });
  let a0 = -Math.PI / 2;
  partes.filter(p => p.v > 0).forEach(p => {
    const a1 = a0 + p.v / tot * Math.PI * 2 - 1e-6, big = a1 - a0 > Math.PI ? 1 : 0, c = S / 2;
    const P = (rr, a) => `${c + rr * Math.cos(a)},${c + rr * Math.sin(a)}`;
    g.append(s('path', { d: `M${P(r, a0)}A${r},${r} 0 ${big} 1 ${P(r, a1)}L${P(ri, a1)}A${ri},${ri} 0 ${big} 0 ${P(ri, a0)}Z`, fill: p.cor, stroke: '#fff', 'stroke-width': 1.5, tip: `<b>${p.label}</b><br>${brl(p.v)} · ${pct(p.v / tot * 100)}` }));
    a0 = a1;
  });
  g.append(s('text', { x: S / 2, y: S / 2 - 2, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, fill: COR.tinta, text: brlK(tot) }), s('text', { x: S / 2, y: S / 2 + 15, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#6F7B76', text: o.sub || 'despesas' }));
  return g;
}
function legenda(itens) { return h('div', { class: 'leg' }, itens.map(([t, c, extra]) => h('span', {}, h('i', { style: `background:${c};${extra || ''}` }), t))); }

// linha do tempo dos pagamentos de uma candidatura
function tempoPag(c, o = {}) {
  const w = 980, ini = o.ini || '2026-08-14', fim = o.fim || '2026-10-05';
  const pg = []; (c.despesas || []).forEach(d => d.pag.forEach(([dt, v]) => { if (dt && v > 0) pg.push({ dt, v, d }); }));
  const cats = [...new Set(pg.map(p => p.d.cat))].sort((a, b) => Object.keys(CAT).indexOf(a) - Object.keys(CAT).indexOf(b));
  const lane = 46, top = 40, H = top + Math.max(1, cats.length) * lane + 30, lw = 170;
  const X = linear(ms(ini), ms(fim), lw, w - 20), maxV = Math.max(...pg.map(p => p.v), 1);
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'linha do tempo dos pagamentos' });
  g.append(s('rect', { x: X(ms('2026-09-27')), y: 18, width: X(ms('2026-10-04')) - X(ms('2026-09-27')), height: H - 44, fill: COR.t3 }), s('text', { x: X(ms('2026-09-27')) + 4, y: 30, 'font-size': 10.5, fill: COR.tinta, text: 'última semana' }));
  g.append(s('line', { x1: X(ms('2026-10-04')), x2: X(ms('2026-10-04')), y1: 14, y2: H - 26, stroke: COR.floresta, 'stroke-width': 1.5 }), s('text', { x: X(ms('2026-10-04')) - 4, y: 12, 'text-anchor': 'end', 'font-size': 10.5, fill: COR.floresta, text: 'eleição 04/10' }));
  for (let t = ms('2026-08-16'); t <= ms(fim); t += 7 * 864e5) { const d = new Date(t).toISOString().slice(0, 10); g.append(s('line', { x1: X(t), x2: X(t), y1: 18, y2: H - 26, stroke: COR.t1 }), s('text', { x: X(t), y: H - 10, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#6F7B76', text: dm(d) })); }
  (c.receitas || []).filter(r => r.d).forEach(r => { const x = X(ms(r.d)); g.append(s('path', { d: `M${x - 7},${top - 22}L${x + 7},${top - 22}L${x},${top - 10}Z`, fill: COR.menta, tip: `<b>Receita ${dm(r.d)}</b><br>${r.origem} · ${r.fonte}<br>${brl(r.v)}` })); });
  g.append(s('text', { x: lw - 8, y: top - 12, 'text-anchor': 'end', 'font-size': 11, fill: COR.menta, text: 'receitas ▼' }));
  cats.forEach((ct, i) => {
    const y = top + i * lane + lane / 2;
    g.append(s('text', { x: lw - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11.5, text: CAT[ct][0] }), s('line', { x1: lw, x2: w - 20, y1: y, y2: y, stroke: COR.t1 }));
    pg.filter(p => p.d.cat === ct).forEach(p => g.append(s('circle', { cx: X(ms(p.dt)), cy: y, r: 4 + Math.sqrt(p.v / maxV) * 15, fill: CAT[ct][1], 'fill-opacity': .82, stroke: '#fff', tip: `<b>${p.d.quem}</b><br>${dmy(p.dt)} · ${brl(p.v)}<br>${p.d.obj || ''}${p.d.obs ? '<br><i>' + p.d.obs + '</i>' : ''}` })));
  });
  return g;
}

// mapa de SC
function mapaSC(nr, o = {}) {
  const V = A.votosMun[String(nr)] || {}, max = Math.max(...Object.values(V), 1), W = A.mapa.w, H = +A.mapa.h;
  const g = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mapa', role: 'img', 'aria-label': 'votos por município' });
  A.mapa.mun.forEach(m => { const v = V[m.c] || 0; g.append(s('path', { d: m.d, fill: escala(v, max), tip: `<b>${m.n}</b><br>${v ? n0(v) + ' voto' + (v > 1 ? 's' : '') : 'nenhum voto'}` })); });
  const wrap = h('div', {}, g);
  const lg = h('div', { class: 'leg' }, h('span', {}, h('i', { style: 'background:#F1F4F3;border:1px solid #C8D5CF' }), 'sem voto'), [1, .25, .5, 1].slice(1).map(t => h('span', {}, h('i', { style: `background:${escala(max * t * t, max)}` }), n0(Math.round(max * t * t)))), h('span', { class: 'muted' }, `${Object.keys(V).length} municípios com voto · máximo ${n0(max)}`));
  wrap.append(lg);
  return wrap;
}
function topMun(nr, k = 10) {
  const V = A.votosMun[String(nr)] || {}; const it = Object.entries(V).sort((a, b) => b[1] - a[1]).slice(0, k);
  const tot = MET[String(nr)] ? MET[String(nr)].votos : Object.values(V).reduce((t, v) => t + v, 0);
  return barrasH(it.map(([c, v], i) => ({ label: NOMEMUN[c] || c, v, txt: `${n0(v)} (${pct(v / tot * 100, 0)})`, cor: i ? COR.verde : COR.floresta })), { w: 520, lw: 190, lh: 22, rw: 80, titulo: 'municípios com mais votos' });
}

// ============================================================ navegação
const PAGINAS = [
  ['visao', 'Visão geral', pgVisao], ['candidatas', 'Candidatas', pgCandidatas], ['votacao', 'Votação por seção', pgVotacao], ['dinheiro', 'Dinheiro', pgDinheiro],
  ['rede', 'Rede de vínculos', pgRede], ['digital', 'Campanha digital', pgDigital], ['historico', 'Histórico 2022–2026', pgHistorico], ['direcao', 'Direção estadual', pgDirecao],
  ['tempo', 'Linha do tempo', pgTempo], ['decisao', 'Decisão e próximos passos', pgDecisao], ['fontes', 'Fontes', pgFontes],
];
const feitas = new Set();
let atual = null, dossieNr = null;
function monta(id) { if (feitas.has(id)) return; const p = PAGINAS.find(p => p[0] === id); const el = $('#pg-' + id); p[2](el); feitas.add(id); }
function vai(id, rolar = true) {
  if (!PAGINAS.some(p => p[0] === id)) id = 'visao';
  monta(id); atual = id;
  $$('section.pg').forEach(e => e.classList.toggle('on', e.id === 'pg-' + id));
  $$('nav.lado a').forEach(a => a.classList.toggle('on', a.dataset.id === id));
  mem.set('pg', id);
  if (location.hash.slice(1) !== id && !(id === 'candidatas' && dossieNr)) history.replaceState(null, '', '#' + id);
  $('#nav').classList.remove('aberto');
  if (rolar) window.scrollTo({ top: 0 });
}

// ============================================================ 01 visão geral
function pgVisao(el) {
  cab(el, '01', 'Visão geral', 'A conta da chapa, o grupo-alvo, a matriz de indícios e a situação das frentes');
  const ch = M.chapa;
  el.append(h('div', { class: 'g g6' },
    kpi('40', 'candidaturas no DRAP (39 na urna)'), kpi('13', 'mulheres (32,5% do DRAP)'), kpi('12', 'mínimo de mulheres (30% de 40)'),
    kpi('1', 'de margem: uma candidatura'), kpi('2', 'fictícias bastam para derrubar a chapa', 'menta'), kpi('4', 'candidatas no grupo de interesse: 2 alvos e 2 reservas', 'menta')));
  el.append(h('div', { class: 'alerta' }, h('b', {}, 'Tese do TSE de 2026. '), ch.tese, ' ', h('span', { class: 'muted' }, M.meta.ressalva)));

  // simulador
  el.append(h('h3', {}, 'Simulador da cota'));
  el.append(h('p', { class: 'small muted' }, 'Marque as candidatas consideradas fictícias. O cálculo segue a tese: a chapa só cai se as mulheres válidas ficarem abaixo de 30%.'));
  const marc = new Set();
  const grade = h('div', { class: 'sim-grade' });
  const res = h('div', { class: 'c' });
  const fila = h('div', { class: 'medidor' });
  MULHERES.forEach(m => {
    const b = h('button', { class: 'sim-c', 'data-nr': m.nr, on: { click: () => { marc.has(m.nr) ? marc.delete(m.nr) : marc.add(m.nr); atualiza(); } } }, foto(m.nr), h('div', {}, h('b', {}, nome(m.nr)), `${n0(m.votos)} votos`));
    grade.append(b);
  });
  const presets = h('div', { class: 'chips' },
    [['Mariel + Kida (par mais forte)', [20522, 20999]], ['Mariel + Martina', [20522, 20444]], ['Mariel + Cris', [20522, 20026]], ['Só Mariel', [20522]], ['Limpar', []]]
      .map(([t, l]) => h('button', { class: 'chip', on: { click: () => { marc.clear(); l.forEach(x => marc.add(x)); atualiza(); } } }, t)));
  function atualiza() {
    $$('.sim-c', grade).forEach(b => b.classList.toggle('on', marc.has(+b.dataset.nr)));
    const v = 13 - marc.size, p40 = v / 40 * 100, p39 = v / 39 * 100, cai = v < 12;
    res.className = 'c ' + (cai ? 'escuro' : 'suave');
    res.innerHTML = '';
    res.append(h('div', { class: 'rot', style: cai ? 'color:#BFD9D4' : '' }, 'Resultado'),
      h('div', { class: 'res-chapa' + (cai ? ' cai' : ''), style: cai ? '' : 'color:#0C5844' }, cai ? 'A chapa cai' : marc.size ? 'Chapa mantida; cassa-se só o registro' : 'Nenhuma candidatura marcada'),
      h('p', { style: 'margin-top:6px' }, h('b', {}, `${v} mulheres válidas de 40 (${pct(p40)})`), ` no DRAP · ${v} de 39 na urna (${pct(p39)}).`),
      cai ? h('p', { class: 'small', style: 'margin-top:6px' }, ch.consequencia) : h('p', { class: 'small', style: 'margin-top:6px' }, marc.size === 1 ? 'Falta uma segunda candidatura fictícia reconhecida.' : 'Bastam duas candidaturas fictícias reconhecidas.'));
    // fileira de 40
    const W = 880, cw = 20, g = s('svg', { viewBox: `0 0 ${W} 74`, role: 'img', 'aria-label': 'composição da chapa' });
    let x = 4, i = 0;
    MULHERES.forEach(m => { const f = marc.has(m.nr); g.append(s('rect', { x, y: 22, width: cw - 3, height: 28, rx: 4, fill: f ? '#fff' : COR.verde, stroke: f ? COR.floresta : 'none', 'stroke-dasharray': f ? '3 2' : null, tip: `<b>${nome(m.nr)}</b><br>${f ? 'marcada como fictícia' : 'válida'}` })); if (f) g.append(s('path', { d: `M${x + 4},28L${x + cw - 7},44M${x + cw - 7},28L${x + 4},44`, stroke: COR.floresta, 'stroke-width': 1.6 })); x += cw; i++; if (i === 12) { g.append(s('line', { x1: x - 1.5, x2: x - 1.5, y1: 12, y2: 60, stroke: COR.menta, 'stroke-width': 2 }), s('text', { x: x - 4, y: 9, 'text-anchor': 'end', 'font-size': 10.5, fill: COR.menta, 'font-weight': 600, text: 'mínimo: 12 mulheres' })); } });
    x += 8;
    for (let j = 0; j < 27; j++) { g.append(s('rect', { x, y: 22, width: cw - 3, height: 28, rx: 4, fill: j === 26 ? '#fff' : COR.cinza, stroke: j === 26 ? COR.cinza : 'none', 'stroke-dasharray': j === 26 ? '3 2' : null, tip: j === 26 ? 'Eroni Foresti (renunciou; não entrou na urna)' : 'homem' })); x += cw; }
    g.append(s('text', { x: 4, y: 68, 'font-size': 11, fill: '#6F7B76', text: '13 mulheres' }), s('text', { x: 13 * cw + 12, y: 68, 'font-size': 11, fill: '#6F7B76', text: '27 homens (o último renunciou: 39 na urna)' }));
    fila.innerHTML = ''; fila.append(g);
  }
  el.append(h('div', { class: 'g', style: 'grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start' }, h('div', {}, presets, grade, fila), h('div', {}, res, h('div', { class: 'c suave', style: 'margin-top:12px' }, h('div', { class: 'rot' }, 'Atenção política'), h('p', { class: 'small', style: 'margin-top:6px' }, ch.politica)))));
  marc.add(20522); marc.add(20999); atualiza();

  // matriz
  el.append(h('h3', {}, 'Matriz de indícios'));
  el.append(h('p', { class: 'small muted' }, 'Cada célula resume um indicador. O tom indica a força do indício; listras indicam que o dado não foi apurado. Clique na linha para abrir o dossiê, ou na célula para ir direto à aba correspondente. Votação e dispersão são calculadas da base de votação por seção; os demais valores vêm dos relatórios.'));
  el.append(legenda([['sem indício / contraindício', 'var(--h0)', 'border:1px solid #C8D5CF'], ['fraco', 'var(--h1)'], ['médio', 'var(--h2)'], ['forte', 'var(--h3)'], ['não apurado', '#fff', 'background:repeating-linear-gradient(135deg,#fff,#fff 3px,#E6EBE9 3px,#E6EBE9 6px);border:1px solid #C8D5CF']]));
  el.append(matriz());
  el.append(fonte('F1 §3 e §4.0; F2; F3; F4 §2; F6; LMM §6; LCR §6'));

  // par mais forte
  el.append(h('h3', {}, 'O par mais forte: Mariel e Kida'));
  const par = [['Votos', '36, um por seção; 1 na própria seção', '107; 4 na própria seção e 20 no local'], ['Gasto', '97,5% em militância; 82,5% pago entre 29/09 e 02/10', '99% em pessoas físicas; 70% pago em 01/10'], ['Material de campanha', 'Nenhum', 'Nenhum'], ['Instagram', 'Privado', 'Privado e sem menção à candidatura'], ['Anúncios na Meta', 'Nenhum', 'Nenhum'], ['Impulsionamento declarado', 'Nenhum', 'Nenhum'], ['Histórico', '2022 e 2024 com o mesmo padrão', '2024 com o mesmo padrão; mesma pessoa paga']];
  el.append(h('div', { class: 'g', style: 'grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start' },
    h('div', { class: 'c' }, tabela([['Indício'], ['Mariel Grando'], ['Renata Aguiar – Kida']], par.map(r => [h('b', {}, r[0]), r[1], r[2]])), fonte('F4 §4; F1 §4.0; F6')),
    h('div', { class: 'c escuro' }, h('div', { style: 'display:flex;gap:10px;margin-bottom:10px' }, foto(20522), foto(20999)), h('p', {}, M.grupo.texto), h('p', { class: 'small', style: 'margin-top:8px' }, 'Ressalva: para Kida, a defesa usará os 20 votos no local de votação em Ratones; o argumento deve se apoiar mais nas contas e na ausência de campanha.'))));

  // frentes
  el.append(h('h3', {}, 'Situação das frentes de investigação'));
  el.append(h('div', { class: 'g g3' }, M.frentes.map(f => h('div', { class: 'c' + (f.situacao === 'Pendente' ? ' suave' : '') },
    h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:baseline' }, h('span', { class: 'rot' }, 'Frente ' + f.n), h('span', { class: 'badge' + (f.situacao === 'Pendente' ? ' contraponto' : '') }, f.situacao)),
    h('h4', { style: 'margin-top:4px' }, f.titulo), h('p', { class: 'small' }, f.achado), h('div', { class: 'nota' }, h('b', {}, 'Pendente: '), f.pendente.join('; ') + '.'), h('div', { class: 'fonte' }, f.doc + ' · ' + f.data)))));
}
function matriz() {
  const linhas = [...MULHERES.map(m => m.nr), 'sep', 20321, 20190, 2090];
  const ind = M.indicadores;
  const ABA = { votos: 'votacao', disp: 'votacao', propria: 'votacao', legado: 'dinheiro', pf: 'dinheiro', final: 'dinheiro', material: 'dinheiro', extrato: 'dinheiro', insta: 'digital', meta: 'digital', hist: 'historico', direcao: 'ident', equipe: 'ident' };
  const t = h('table', { class: 'mz' });
  t.append(h('thead', {}, h('tr', {}, h('th', {}, 'Candidatura'), ind.map(i => h('th', { tip: i.dica }, i.rot)), h('th', { style: 'text-align:center', tip: 'Número de indicadores em nível forte' }, 'Fortes'))));
  const tb = h('tbody'); t.append(tb);
  linhas.forEach(nr => {
    if (nr === 'sep') { tb.append(h('tr', { class: 'sep' }, h('td', { colspan: ind.length + 2 }))); return; }
    const m = MET[String(nr)], mz = M.matriz[String(nr)] || {}, c = M.cand[String(nr)];
    let fortes = 0;
    const tr = h('tr', {}, h('td', { class: 'nm', on: { click: () => abreDossie(nr) } }, h('div', {}, foto(nr, 'p'), h('div', {}, h('b', {}, nome(nr)), h('div', { class: 'small muted' }, (c ? TIPOS[c.tipo] : '') + (nr === 2090 ? ' · federal' : ''))))));
    ind.forEach(i => {
      let v = null, sc = null;
      if (i.id === 'votos') { if (m) { v = n0(m.votos); sc = m.votos < 60 ? 3 : m.votos < 100 ? 2 : m.votos < 200 ? 1 : 0; } else if (nr === 2090) { v = '688 (federal)'; } }
      else if (i.id === 'disp') { if (m) { v = m.p1 + '%'; sc = m.p1 >= 99 ? 3 : m.p1 >= 95 ? 2 : m.p1 >= 85 ? 1 : 0; } }
      else if (mz[i.id]) { [v, sc] = mz[i.id]; }
      if (sc === 3) fortes++;
      tr.append(h('td', { class: sc == null ? 'sn' : 's' + sc, tip: `<b>${nome(nr)} · ${i.rot}</b><br>${v == null ? 'não apurado' : v}<br><span style="opacity:.75">${i.dica}</span>`, on: { click: () => abreDossie(nr, ABA[i.id]) } }, v == null ? '—' : v));
    });
    tr.append(h('td', { class: 'tot' }, String(fortes)));
    tb.append(tr);
  });
  return h('div', { class: 'tw c', style: 'padding:8px' }, t);
}

// ============================================================ 02 candidatas
function pgCandidatas(el) {
  cab(el, '02', 'Candidatas', 'Dossiê individual: identificação, votação, dinheiro, campanha digital, histórico e Súmula 73');
  const grupos = [
    ['Grupo-alvo', n => M.cand[n] && M.cand[n].tipo === 'alvo'], ['Reserva', n => M.cand[n] && M.cand[n].tipo === 'reserva'],
    ['Demais mulheres da chapa', n => MET[n] && MET[n].sexo === 'F' && M.cand[n] && M.cand[n].tipo === 'fora'],
    ['Contrapontos, direção e federais clientes da Legado', n => M.cand[n] && ['contraponto', 'dirigente', 'federal'].includes(M.cand[n].tipo)],
  ];
  const todos = Object.keys(M.cand).sort((a, b) => ((MET[a] || {}).votos || 1e9) - ((MET[b] || {}).votos || 1e9));
  grupos.forEach(([t, f]) => {
    const l = todos.filter(f); if (!l.length) return;
    el.append(h('h3', {}, t), h('div', { class: 'cards-c' }, l.map(nr => {
      const m = MET[nr], c = M.cand[nr];
      return h('button', { class: 'cc', 'data-nr': nr, on: { click: () => abreDossie(+nr) } }, foto(nr), h('div', {}, h('div', { class: 'nm' }, nome(nr)), h('div', { class: 'mt' }, `nº ${nr} · ${c.cargo}`), h('div', { class: 'mt' }, m ? `${n0(m.votos)} votos · ${brlK(m.receita)} · R$ ${n0(m.rpv)}/voto` : (c.totais ? brlK(c.totais.receita) + ' de receita' : '')), h('div', { style: 'margin-top:4px' }, badge(c.tipo))));
    })));
  });
  el.append(h('div', { id: 'dossie', class: 'dossie' }));
}
function abreDossie(nr, aba) {
  nr = String(nr);
  if (!M.cand[nr]) return;
  dossieNr = nr;
  vai('candidatas', false);
  $$('.cc').forEach(b => b.classList.toggle('on', b.dataset.nr === nr));
  const el = $('#dossie'); el.innerHTML = '';
  dossie(el, nr, aba);
  history.replaceState(null, '', '#c-' + nr);
  $('#sel-cand').value = nr;
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
}
function dossie(el, nr, abaIni) {
  const c = M.cand[nr], m = MET[nr], tse = A.cand[nr] || {};
  el.append(h('div', { class: 'c' }, h('div', { class: 'dos-cab' }, foto(nr, 'g'), h('div', { class: 'info' },
    h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, badge(c.tipo), h('span', { class: 'rot' }, `${c.cargo} · nº ${nr}${tse.resultado ? ' · ' + tc(tse.resultado) : ''}`)),
    h('h3', {}, nome(nr)), h('div', { class: 'muted small' }, tse.nome ? tc(tse.nome) : ''), h('p', { class: 'lead' }, c.lead)))));
  const ks = [];
  if (m) ks.push(kpi(n0(m.votos), 'votos'), kpi(m.p1 + '%', `das ${n0(m.secoes)} seções com 1 voto`), kpi(n0(m.municipios), 'municípios com voto'), kpi(brlK(m.receita), `receita (FEFC ${brlK(m.fefc)})`), kpi('R$ ' + n0(m.rpv), 'por voto'));
  else if (c.totais) ks.push(kpi(brlK(c.totais.receita), 'receita'), kpi(brlK(c.totais.despesa), 'despesa declarada'));
  if (c.totais && m) ks.push(kpi(brlK(c.totais.despesa), 'despesa declarada'));
  if (ks.length) el.append(h('div', { class: 'g g6 dos-kpi', style: 'margin-top:12px' }, ks));
  const abas = [['ident', 'Identificação', abaIdent]];
  if (m || c.votacaoNotas) abas.push(['votacao', 'Votação', abaVotacao]);
  if (c.despesas || c.contasNotas || c.doacoesRecebidas) abas.push(['dinheiro', 'Dinheiro', abaDinheiro]);
  if (c.digital || igDe(nr)) abas.push(['digital', 'Campanha digital', abaDigital]);
  if (c.hist && c.hist.length) abas.push(['historico', 'Histórico', abaHist]);
  if (c.sumula) abas.push(['sumula', 'Súmula 73', abaSumula]);
  abas.push(['pend', 'Pendências e fontes', abaPend]);
  const barra = h('div', { class: 'abas' }), corpo = h('div');
  abas.forEach(([id, t, fn]) => {
    const pane = h('div', { class: 'aba', 'data-a': id }); fn(pane, c, nr, m); corpo.append(pane);
    barra.append(h('button', { 'data-a': id, on: { click: () => mostra(id) } }, t));
  });
  function mostra(id) { if (!abas.some(a => a[0] === id)) id = 'ident'; $$('.abas button', el).forEach(b => b.classList.toggle('on', b.dataset.a === id)); $$('.aba', el).forEach(p => p.classList.toggle('on', p.dataset.a === id)); }
  el.append(barra, corpo); mostra(abaIni || 'ident');
}
function abaIdent(p, c, nr) {
  const tse = A.cand[nr] || {};
  const g = h('div', { class: 'g g2', style: 'align-items:start' });
  g.append(h('div', { class: 'c' }, h('h4', {}, 'Dados levantados'), tabela([['Campo'], ['Dado']], c.ident.map(r => [r[0], r[1]]))));
  if (tse.sq) g.append(h('div', { class: 'c' }, h('h4', {}, 'Cadastro de candidatura (TSE)'), tabela([['Campo'], ['Dado']], [['Nome civil', tc(tse.nome)], ['Nome de urna', tc(tse.urna)], ['SQ', tse.sq], ['Gênero', tc(tse.genero)], ['Nascimento', tse.nasc], ['Cor/raça', tc(tse.cor)], ['Estado civil', tc(tse.civil)], ['Instrução', tc(tse.instrucao)], ['Ocupação', tc(tse.ocupacao)], ['Resultado', tc(tse.resultado)]]), fonte('consulta_cand_2026 (situação de 25/10/2026)')));
  p.append(g);
  if (c.processos && c.processos.length) p.append(h('h4', {}, 'Processos'), h('div', { class: 'c' }, tabela([['Classe'], ['Número'], ['Situação e achados']], c.processos.map(r => [h('b', {}, r[0]), h('span', { style: 'white-space:nowrap' }, r[1]), r[2]]))));
  if (c.quitacao) p.append(h('h4', {}, 'Como a quitação eleitoral foi obtida'), h('div', { class: 'c suave' }, tabela([['Data'], ['Fato']], c.quitacao.map(q => [h('b', {}, dmy(q.d)), q.t]))));
}
function abaVotacao(p, c, nr, m) {
  if (m) {
    const own = A.votoProprio[nr];
    p.append(h('div', { class: 'g g2', style: 'align-items:start' }, h('div', { class: 'c' }, h('h4', {}, 'Votos por município'), mapaSC(nr)), h('div', {},
      h('div', { class: 'c' }, h('h4', {}, 'Municípios com mais votos'), topMun(nr)),
      h('div', { class: 'c', style: 'margin-top:14px' }, h('h4', {}, 'Locais de votação com mais votos'), tabela([['Município'], ['Zona', 'r'], ['Local'], ['Votos', 'r']], (A.topLocais[nr] || []).slice(0, 6).map(l => [tc(l.mun), l.zona, tc(l.local), l.votos]))))));
    p.append(h('div', { class: 'g g4', style: 'margin-top:14px' }, kpi(n0(m.secoes), `seções com voto; ${n0(m.secoes1)} com um único voto`), kpi(n0(m.maxSecao), 'máximo numa seção'), kpi(n0(m.maxLocal), `máximo num local (de ${n0(m.locais)} locais)`), kpi(n0(m.zonas), 'zonas eleitorais')));
    if (own && c.propriaSecao) {
      const ps = c.propriaSecao, wf = h('div', { class: 'waffle', 'aria-label': 'votos válidos na seção' });
      for (let i = 0; i < ps.validos; i++) wf.append(h('i', { class: i < own.naSecao ? 'x' : '' }));
      p.append(h('div', { class: 'c escuro', style: 'margin-top:14px' }, h('div', { class: 'g g2', style: 'align-items:center' },
        h('div', {}, h('div', { class: 'rot', style: 'color:#BFD9D4' }, 'Voto na própria seção'), h('div', { class: 'res-chapa cai', style: 'font-size:34px' }, `${own.naSecao} de ${ps.validos}`), h('p', {}, `Seção ${own.secao}, zona ${own.zona} (Florianópolis) – ${tc(own.local)}. No local de votação inteiro: ${n0(own.noLocal)} voto${own.noLocal > 1 ? 's' : ''}${ps.localVotos ? ` de ${n0(ps.localVotos)}` : ''}${ps.localSecoes ? ` (${ps.localSecoes} seções)` : ''}.`), h('p', { class: 'small' }, 'Cada quadrado é um voto válido para deputado estadual na seção; o destacado é o da candidata.')),
        h('div', { style: 'background:#fff;padding:10px;border-radius:8px' }, wf)), fonte('F1 §4.0 (seção e total da seção); votacao_secao_2026_SC (votos da candidata)')));
    }
  }
  if (c.votacaoNotas) p.append(h('div', { class: 'c suave', style: 'margin-top:14px' }, lista(c.votacaoNotas)));
}
function catTotais(c) { const t = {}; (c.despesas || []).forEach(d => d.pag.forEach(([, v]) => { t[d.cat] = (t[d.cat] || 0) + v; })); return t; }
function abaDinheiro(p, c, nr) {
  if (c.despesas) {
    const t = catTotais(c), partes = Object.keys(CAT).filter(k => t[k] > 0).map(k => ({ label: CAT[k][0], v: t[k], cor: CAT[k][1] }));
    const decl = Object.entries(t).filter(([k]) => k !== 'omitido').reduce((s_, [, v]) => s_ + v, 0);
    p.append(h('div', { class: 'g', style: 'grid-template-columns:240px minmax(0,1fr);align-items:start' },
      h('div', { class: 'c' }, rosca(partes, { sub: t.omitido ? 'declaradas + extrato' : 'despesas' }), legenda(partes.map(x => [x.label, x.cor]))),
      h('div', { class: 'c' }, h('h4', {}, 'Receitas'), tabela([['Data'], ['Origem'], ['Fonte'], ['R$', 'r']], (c.receitas || []).map(r => [r.d ? dmy(r.d) : '—', r.origem, r.fonte, brl(r.v)])),
        c.totais ? h('div', { class: 'g g3', style: 'margin-top:12px' }, kpi(brl(c.totais.receita), 'receita declarada'), kpi(brl(c.totais.despesa), 'despesa declarada (paga)'), h('div', { class: 'c kpi' }, h('div', { class: 'l', style: 'margin:0' }, 'Sobra de FEFC'), h('div', { style: 'font-weight:500;color:#0C5844;margin-top:4px' }, /^\d/.test(c.totais.sobra) ? 'R$ ' + c.totais.sobra : c.totais.sobra))) : null,
        c.totais && c.totais.nota ? h('div', { class: 'nota' }, c.totais.nota) : null,
        t.omitido ? h('div', { class: 'alerta forte', style: 'margin-top:10px' }, h('b', {}, `${brl(t.omitido)} fora da PCE`), ' identificados no extrato bancário.') : null)));
    if (c.despesas.some(d => d.pag.some(x => x[0]))) p.append(h('div', { class: 'c', style: 'margin-top:14px' }, h('h4', {}, 'Quando o dinheiro saiu'), tempoPag(c), h('div', { class: 'nota' }, 'Cada círculo é um pagamento (área proporcional ao valor); triângulos são receitas. A faixa marca a última semana antes da eleição. Pagamentos sem data no levantamento ficam só na tabela.')));
    p.append(h('div', { class: 'c', style: 'margin-top:14px' }, h('h4', {}, 'Despesas item a item'), tabela([['Fornecedor ou contratado'], ['Categoria'], ['Objeto'], ['Contrato'], ['Pagamentos'], ['R$', 'r', true], ['Observação']],
      c.despesas.map(d => { const v = d.pag.reduce((s_, x) => s_ + x[1], 0); return [[h('b', {}, d.quem, d.cpf ? h('div', { class: 'small muted' }, 'CPF ' + d.cpf) : null), h('span', { class: 'badge', style: `background:${CAT[d.cat][1]};color:${['tarifa', 'outros', 'impuls'].includes(d.cat) ? '#0C5844' : '#fff'}` }, CAT[d.cat][0]), d.obj || '', d.contrato || '—', d.pag.map(x => (x[0] ? dm(x[0]) : 's/ data') + ': ' + brl(x[1])).join('; '), nk(brl(v), v), d.obs || ''], { cls: d.cat === 'omitido' ? 'dest' : '' }]; }),
      { foot: ['Total', '', '', '', '', brl(c.despesas.reduce((s_, d) => s_ + d.pag.reduce((u, x) => u + x[1], 0), 0)), t.omitido ? `declarado ${brl(decl)} + extrato ${brl(t.omitido)}` : ''] })));
  }
  if (c.contasNotas) p.append(h('div', { class: 'c suave', style: 'margin-top:14px' }, h('h4', {}, 'Leitura das contas'), lista(c.contasNotas)));
  if (c.doacoesRecebidas) p.append(doacoes(c));
}
function doacoes(c) {
  return h('div', { class: 'g g2', style: 'margin-top:14px' },
    h('div', { class: 'c' }, h('h4', {}, 'Doações recebidas de dirigentes e ligados'), tabela([['Data'], ['Doador'], ['R$', 'r']], c.doacoesRecebidas.map(d => [dm(d[0]), d[1], brl(d[2])]))),
    h('div', { class: 'c' }, h('h4', {}, 'Doações feitas a candidatos'), tabela([['Data'], ['Recebedor'], ['R$', 'r'], ['Fonte']], c.doacoesFeitas.map(d => [dm(d[0]), d[1], brl(d[2]), d[3]]))));
}
function igDe(nr) { const r = M.igResumo.find(x => x.nr === +nr); return r ? A.instagram[r.chave] : null; }
function abaDigital(p, c, nr) {
  const d = c.digital;
  if (d) p.append(h('div', { class: 'g g2', style: 'align-items:start' }, h('div', { class: 'c' }, tabela([['Item'], ['Situação em 24/11/2026']], [['Perfil', d.perfil], ['Situação', h('b', {}, d.situacao)], ['Seguidores', d.seguidores == null ? '—' : n0(d.seguidores)], ['Publicações', d.publicacoes == null ? '—' : n0(d.publicacoes)], ['Bio', d.bio], ['Anúncios na Meta (2026)', d.anuncios], ['Impulsionamento declarado', d.impuls]])),
    h('div', { class: 'c ' + (/Privado|Removido/.test(d.situacao) ? 'escuro' : 'suave') }, h('div', { class: 'rot', style: /Privado|Removido/.test(d.situacao) ? 'color:#BFD9D4' : '' }, 'Campanha visível'), h('p', { style: 'margin-top:6px;font-size:15px' }, d.campanha))));
  const ig = igDe(nr);
  if (ig) { const r = M.igResumo.find(x => x.nr === +nr); p.append(h('div', { class: 'c', style: 'margin-top:14px' }, h('h4', {}, `Publicações por dia (${r.pub} de campanha; mediana de ${r.med} curtidas)`), porDia([[r.perfil, ig, COR.verde]]), h('div', { class: 'nota' }, 'Lista completa e comparação na página Campanha digital.'))); }
  p.append(fonte('F4 §2 e §2-A; planilhas de publicações (coleta de 24/11/2026)'));
}
function abaHist(p, c) {
  p.append(h('div', { class: 'c' }, tabela([['Ano'], ['Cargo'], ['Votos', 'r'], ['Receita', 'r'], ['FEFC', 'r'], ['Pessoal / militância'], ['Própria seção'], ['Resultado'], ['Contas']], c.hist.map(x => [h('b', {}, x.ano), x.cargo, n0(x.votos), brl(x.receita), brl(x.fefc), x.pessoal, x.propria, x.resultado, x.contas]))));
  c.hist.filter(x => x.detalhe).forEach(x => p.append(h('div', { class: 'c suave', style: 'margin-top:10px' }, h('b', {}, x.ano + ' · '), x.detalhe)));
  if (c.hist.length > 1 && c.hist.every(x => x.votos)) {
    const w = 640, H = 220, X = i => 90 + i * (w - 160) / (c.hist.length - 1), maxV = Math.max(...c.hist.map(x => x.votos)), maxF = Math.max(...c.hist.map(x => x.fefc || 0));
    const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'série histórica' });
    c.hist.forEach((x, i) => { const bh = (x.fefc || 0) / maxF * 120; g.append(s('rect', { x: X(i) - 30, y: 170 - bh, width: 26, height: bh, rx: 3, fill: COR.t2, tip: `FEFC ${brl(x.fefc)}` }), s('text', { x: X(i) - 17, y: 165 - bh, 'text-anchor': 'middle', 'font-size': 10.5, text: brlK(x.fefc) })); const vh = x.votos / maxV * 120; g.append(s('rect', { x: X(i) + 2, y: 170 - vh, width: 26, height: vh, rx: 3, fill: COR.verde, tip: `${n0(x.votos)} votos` }), s('text', { x: X(i) + 15, y: 165 - vh, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, text: n0(x.votos) }), s('text', { x: X(i), y: 190, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: COR.tinta, text: x.ano })); });
    p.append(h('div', { class: 'c', style: 'margin-top:14px' }, h('h4', {}, 'FEFC recebido e votos por eleição'), g, legenda([['FEFC (escala própria)', COR.t2], ['votos (escala própria)', COR.verde]])));
  }
}
function abaSumula(p, c) {
  const S_ = c.sumula;
  p.append(h('p', { class: 'small muted' }, 'Elementos objetivos da Súmula 73 do TSE: (1) votação inexpressiva, (2) prestação de contas padronizada ou sem movimentação relevante, (3) ausência de atos efetivos de campanha.'));
  p.append(h('div', { class: 's73', style: 'margin-top:10px' }, [['(1) Votação', S_.votacao], ['(2) Contas', S_.contas], ['(3) Atos de campanha', S_.atos]].map(([t, x]) => h('div', { class: 'c' }, h('h4', {}, t), h('div', { class: 'rot' }, 'Indícios'), h('ul', { class: 'ind' }, x.ind.map(i => h('li', {}, i))), h('div', { class: 'rot', style: 'margin-top:8px' }, 'Contraindícios'), h('ul', { class: 'ind contra' }, x.contra.map(i => h('li', {}, i)))))));
}
function abaPend(p, c) {
  if (c.pend && c.pend.length) p.append(h('div', { class: 'c' }, h('h4', {}, 'O que falta apurar'), lista(c.pend)));
  p.append(h('div', { class: 'c suave', style: 'margin-top:12px' }, h('h4', {}, 'Fontes deste dossiê'), h('p', { class: 'small' }, c.fontes), h('p', { class: 'small muted' }, 'Siglas: PI plano de investigação; F1–F6 frentes; LM levantamento de Mariel (20/11); LMM levantamento conjunto Mariel e Martina (23/11); LCR levantamento de Cris e Raquel (23/11).')));
}

// ============================================================ 03 votação
function pgVotacao(el) {
  cab(el, '03', 'Votação por seção', 'Onde e como cada candidatura recebeu votos (votacao_secao_2026_SC, 17.326 seções)');
  el.append(h('div', { class: 'alerta' }, h('b', {}, 'Leitura. '), 'Mariel, Martina e Cris tiveram um voto por seção e um único voto na seção onde votam. Mas a dispersão também aparece em homens de votação baixa (Prof. Renato): sozinha, não distingue a candidatura fictícia. O que diferencia é o conjunto com as contas e a ausência de campanha.'));
  const pts = A.metricas.map(m => ({ x: m.votos, y: m.p1, r: 6 + Math.sqrt(m.receita) / 70, cor: m.sexo === 'F' ? COR.verde : COR.cinza, op: m.sexo === 'F' ? .9 : .7, borda: [20522, 20999].includes(m.nr) ? COR.floresta : [20444, 20026].includes(m.nr) ? COR.menta : null, z: m.sexo === 'F' ? 2 : 1, label: m.sexo === 'F' && m.votos < 400 || m.nr === 20321 ? nome(m.nr) : null, dy: { 20444: -10, 20026: 14, 20010: -10, 20055: 14, 20999: -10, 20250: 14 }[m.nr] || 4, tip: `<b>${nome(m.nr)}</b> (${m.nr})<br>${n0(m.votos)} votos · ${m.p1}% das seções com 1 voto<br>${brl(m.receita)} · R$ ${n0(m.rpv)}/voto`, on: M.cand[m.nr] ? () => abreDossie(m.nr, 'votacao') : null }));
  const pts2 = A.metricas.map(m => ({ x: m.votos, y: m.receita, r: 7, cor: m.sexo === 'F' ? COR.verde : COR.cinza, borda: [20522, 20999].includes(m.nr) ? COR.floresta : [20444, 20026].includes(m.nr) ? COR.menta : null, z: m.sexo === 'F' ? 2 : 1, label: (m.sexo === 'F' && m.votos < 200) || m.nr === 20321 ? nome(m.nr) : null, dy: { 20999: 14, 20026: -9, 20010: -9, 20321: 14 }[m.nr] || 4, tip: `<b>${nome(m.nr)}</b><br>${n0(m.votos)} votos · ${brl(m.receita)}<br>R$ ${n0(m.rpv)} por voto`, on: M.cand[m.nr] ? () => abreDossie(m.nr, 'dinheiro') : null }));
  const iso = (g, X, Y) => [25, 100, 250, 500].forEach(r => { const xa = Math.max(30, 8000 / r), xb = Math.min(60000, 1e6 / r); if (xa >= xb) return; g.append(s('line', { x1: X(xa), y1: Y(xa * r), x2: X(xb), y2: Y(xb * r), stroke: COR.t2, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' })); g.append(s('text', { x: X(xb) - 4, y: Y(xb * r) + 14, 'text-anchor': 'end', 'font-size': 10.5, fill: COR.tinta, text: `R$ ${r}/voto` })); });
  el.append(h('div', { class: 'g g2' },
    h('div', { class: 'c' }, h('h4', {}, 'Votos × seções com um único voto'), dispersao(pts, { xlog: true, xd: [30, 60000], yd: [25, 102], yticks: [30, 40, 50, 60, 70, 80, 90, 100], yfmt: v => v + '%', xlab: 'votos (escala logarítmica)', ylab: '% das seções com 1 voto', titulo: 'dispersão de votos' }),
      legenda([['mulheres', COR.verde], ['homens', COR.cinza], ['grupo-alvo', '#fff', 'border:2.5px solid #0D251A'], ['reserva', '#fff', 'border:2.5px solid #00A170']]), h('div', { class: 'nota' }, 'Tamanho do círculo proporcional à receita. Clique para abrir o dossiê.')),
    h('div', { class: 'c' }, h('h4', {}, 'Receita × votos (custo por voto)'), dispersao(pts2, { xlog: true, ylog: true, xd: [30, 60000], yd: [8000, 1000000], yfmt: brlK, xlab: 'votos (escala logarítmica)', ylab: 'receita (escala logarítmica)', extra: [iso], titulo: 'custo por voto' }),
      h('div', { class: 'nota' }, 'Carla Z Pereira (R$ 512/voto) e Lu Indalécio (R$ 431/voto) têm o maior custo por voto; Carla tem campanha estruturada, Lu omitiu R$ 12.400,00.'))));
  // própria seção
  el.append(h('h3', {}, 'Voto na própria seção'));
  const P = [[20444, 245, 282, 'E.B.M. Paulo Fontes'], [20522, 68, 263, 'SENAI – CTAI'], [20026, 313, 255, 'E.E.M. Jacó Anderle'], [20999, 82, 286, 'E.B.M. Mâncio Costa (Ratones)']];
  el.append(h('div', { class: 'g g4' }, P.map(([nr, sc, val, loc]) => { const o = A.votoProprio[nr]; return h('div', { class: 'c ' + (o.naSecao === 1 ? 'escuro' : ''), style: 'cursor:pointer', on: { click: () => abreDossie(nr, 'votacao') } }, h('div', { style: 'display:flex;gap:10px;align-items:center' }, foto(nr, 'p'), h('b', {}, nome(nr))), h('div', { class: 'kpi' }, h('div', { class: 'v', style: o.naSecao === 1 ? 'color:#fff' : '' }, `${o.naSecao} de ${val}`), h('div', { class: 'l', style: o.naSecao === 1 ? 'color:#BFD9D4' : '' }, `votos na seção ${sc} (zona 100) · ${o.noLocal} no local (${loc})`))); })));
  el.append(fonte('F1 §4.0: seção obtida na "Informação de candidato" dos RCand (Mariel, Cris, Kida) e na certidão de quitação (Martina)'));
  // tabela
  el.append(h('h3', {}, 'As 13 mulheres e o homem de votação comparável'));
  const linhas = A.metricas.filter(m => m.sexo === 'F' || m.nr === 20321).sort((a, b) => a.votos - b.votos).map(m => [[h('b', {}, nome(m.nr)), m.nr, nk(n0(m.votos), m.votos), nk(n0(m.secoes), m.secoes), nk(m.p1 + '%', m.p1), nk(m.maxSecao, m.maxSecao), nk(m.maxLocal, m.maxLocal), nk(m.municipios, m.municipios), nk(m.zonas, m.zonas), `${tc(m.topMun)} (${m.votosTop}; ${m.pTop}%)`, nk(brl(m.receita), m.receita), nk(n0(m.rpv), m.rpv)], { cls: m.sexo === 'M' ? 'dest' : '', on: () => abreDossie(m.nr, 'votacao') }]);
  el.append(h('div', { class: 'c' }, tabela([['Candidatura'], ['Nº'], ['Votos', 'r', true], ['Seções', 'r', true], ['% 1 voto', 'r', true], ['Máx. seção', 'r', true], ['Máx. local', 'r', true], ['Municípios', 'r', true], ['Zonas', 'r', true], ['Município com mais votos'], ['Receita', 'r', true], ['R$/voto', 'r', true]], linhas), h('div', { class: 'nota' }, 'Linha destacada: Prof. Renato (homem). Clique nos cabeçalhos para ordenar.')));
  // mapa livre
  el.append(h('h3', {}, 'Mapa por candidatura'));
  const sel = h('select', { class: 'sel', style: 'display:block;max-width:360px;margin-bottom:10px' }, A.metricas.slice().sort((a, b) => a.votos - b.votos).map(m => h('option', { value: m.nr }, `${nome(m.nr)} (${m.nr}) – ${n0(m.votos)} votos`)));
  const box = h('div', { class: 'g g2', style: 'align-items:start' });
  const desenha = () => { box.innerHTML = ''; box.append(h('div', { class: 'c' }, mapaSC(sel.value)), h('div', { class: 'c' }, h('h4', {}, 'Municípios com mais votos'), topMun(sel.value, 12))); };
  sel.addEventListener('change', desenha); sel.value = 20522; desenha();
  el.append(sel, box);
  el.append(h('div', { class: 'g g2', style: 'margin-top:14px' },
    h('div', { class: 'c suave' }, h('h4', {}, 'Os eleitos tiveram reduto'), lista(M.chapa.eleitos.map(e => `<b>${e.nome}</b> (${e.nr}), eleito por ${e.via}: ${e.reduto}.`)), h('p', { class: 'small' }, `Chapa: ${n0(M.chapa.votosChapa)} votos (${n0(M.chapa.nominais)} nominais e ${n0(M.chapa.legenda)} de legenda).`)),
    h('div', { class: 'c suave' }, h('h4', {}, 'Hipótese exploratória: voto por engano de número'), lista(['Raquel (20021) e Cris (20026): seções fortes de Fabio Botelho (20020, eleito), que difere em um dígito (razões 5,1 e 3,6).', 'Martina (20444): seções fortes de Marquinho Kurtz (20456), de Balneário Camboriú (razão 6,9).', '<b>Indício fraco</b>: as razões são altas para quase todos os pares, porque os votos se concentram na Grande Florianópolis. Não usar sem teste estatístico.']), fonte('F1 §5'))));
}

// ============================================================ 04 dinheiro
function pgDinheiro(el) {
  cab(el, '04', 'Dinheiro', 'O circuito da Legado, o diretório estadual, os repasses entre candidaturas e o que o extrato mostra');
  const L = M.legado;
  el.append(h('div', { class: 'g g4' }, kpi('R$ 33.300', '11 PIX à Legado, todos de cinco mulheres do PODE/SC', 'menta'), kpi('10', 'notas fiscais emitidas – todas para essas cinco'), kpi('03/07/2026', 'abertura da empresa, um mês antes das convenções'), kpi('R$ 273.000', 'pagos pelo diretório à equipe Target/Wanderlinde, que a Legado dizia "intermediar"')));
  el.append(h('h3', {}, 'O circuito da Legado'));
  el.append(h('div', { class: 'c' }, sankeyLegado(), h('div', { class: 'nota' }, 'Largura proporcional ao valor pago. Todos os PIX foram para a mesma conta de pagamento da Legado na PagSeguro. No extrato nacional, a Legado não aparece como contraparte de nenhum outro candidato.'), fonte('F2 §7; LCR §4.1')));
  el.append(h('div', { class: 'g g2', style: 'margin-top:14px;align-items:start' },
    h('div', { class: 'c' }, h('h4', {}, 'Quanto menor a campanha, maior a fatia'), barrasH(L.clientes.slice().sort((a, b) => b.pago / b.fefc - a.pago / a.fefc).map(c => ({ label: `${c.nome} (${c.cargo.toLowerCase()})`, v: c.pago / c.fefc * 100, txt: `${pct(c.pago / c.fefc * 100)} · ${brl(c.pago)} de ${brlK(c.fefc)}`, cor: c.cargo === 'Estadual' ? COR.floresta : COR.verde, forte: c.cargo === 'Estadual', on: () => abreDossie(c.nr, 'dinheiro') })), { w: 640, lw: 210, rw: 190, max: 50, titulo: 'fatia do FEFC paga à Legado' }), h('p', { class: 'small', style: 'margin-top:6px' }, 'As três estaduais destinaram R$ 19.500,00 de R$ 80.000,00 (24,4%); as duas federais, R$ 13.800,00 de R$ 250.000,00 (5,5%). Total: 10,1% do FEFC das cinco.')),
    h('div', { class: 'c' }, h('h4', {}, 'As dez notas fiscais da Legado'), notasLegado(), h('div', { class: 'nota' }, 'A NFS-e nº 1, que faltava, é de Melissa. As notas 7 e 8 foram emitidas perto da meia-noite. A empresa não emitiu nota a nenhum outro cliente.'))));
  el.append(h('div', { class: 'g g2', style: 'margin-top:14px;align-items:start' },
    h('div', { class: 'c escuro' }, h('h4', {}, 'Ficha da empresa'), tabela([['Campo'], ['Dado']], [['Razão social', L.razao], ['CNPJ', L.cnpj], ['Abertura', L.abertura], ['Sede', L.sede], ['Atividade', L.atividade], ['Capital', L.capital], ['Sócios', L.socios.join('; ')], ['Telefone', L.telefone], ['Recebimento', L.conta]].map(r => [r[0], r[1]]))),
    h('div', {}, h('div', { class: 'alerta forte' }, h('b', {}, 'Isaac Pacheco Silva. '), L.homonimia), h('div', { class: 'c suave' }, h('h4', {}, 'Contratos'), h('p', { class: 'small' }, L.contratos), h('p', { class: 'small', style: 'margin-top:6px' }, L.semOutros)), h('div', { class: 'alerta' }, L.leitura))));
  el.append(h('h4', {}, 'Os 11 PIX à Legado (extrato bancário, base de 24/11/2026)'));
  el.append(h('div', { class: 'c' }, tabela([['Candidata'], ['Data no banco'], ['R$', 'r'], ['Conta de origem']], L.pix.map(p => [p[0], dmy(p[1]), brl(p[2]), p[3]]), { foot: ['Total (11 PIX)', '', brl(L.pix.reduce((t, p) => t + p[2], 0)), 'todos para a conta PagSeguro 86122337-8'] })));
  // diretório
  el.append(h('h3', {}, 'Diretório estadual: contratado × pago'));
  const D_ = M.diretorio;
  el.append(h('div', { class: 'g', style: 'grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);align-items:start' },
    h('div', { class: 'c' }, barrasH(D_.despesas.map(d => ({ label: d.f.replace(/ \(.+\)/, '') + (d.o.includes('mulher') ? ' – "mulher"' : ''), v: d.p, fundo: d.c, cor: d.equipe ? COR.floresta : COR.verde, forte: d.equipe, txt: `${brlK(d.p)} de ${brlK(d.c)}`, tip: `<b>${d.f}</b><br>${d.o}<br>Contratado ${brl(d.c)} · pago ${brl(d.p)}` })), { w: 700, lw: 250, rw: 140, titulo: 'despesas do diretório' }), legenda([['pago – equipe jurídica e contábil das candidatas', COR.floresta], ['pago – demais', COR.verde], ['contratado', COR.t1]]), h('div', { class: 'nota' }, `Receitas: FEFC de R$ 500.000,00 da Direção Nacional e R$ 108.860,00 do PL/SC. Contratado R$ 545.800,00; pago R$ 377.000,00. PCE ${D_.pce}.`)),
    h('div', {}, h('div', { class: 'alerta forte' }, h('b', {}, 'A candidata pagou para intermediar um serviço que o partido já pagava. '), 'O contrato da Legado com Cris lista "intermediação com equipe jurídica e contábil". Essa equipe – a Target (sócios Wanderlinde e Pereira) – já recebia R$ 273.000,00 do FEFC do diretório pela assessoria das mesmas candidatas.'), h('div', { class: 'c suave' }, h('p', { class: 'small' }, D_.target), h('p', { class: 'small', style: 'margin-top:6px' }, 'Bessa Neto & Brustolin: R$ 56.000,00 por assessoria jurídica "mulher", sem contrato juntado com esse nome; objeto concreto em aberto. Luis Irapuan Campelo Bessa Neto foi advogado de Mariel em 2022.'), h('p', { class: 'small', style: 'margin-top:6px' }, D_.municipais), fonte(D_.fonte)))));
  // FEFC gênero
  el.append(h('h3', {}, 'Divisão do FEFC por gênero'));
  el.append(h('div', { class: 'g g2', style: 'align-items:start' }, h('div', { class: 'c' }, barrasH(M.fefcGenero.map(f => ({ label: f.rec, v: f.p, txt: `${pct(f.p)} (${brlK(f.f)} de ${brlK(f.f + f.m)})`, cor: f.p < 30 ? COR.floresta : COR.verde, forte: f.p < 30 })), { w: 640, lw: 250, rw: 160, max: 45, linha: 30, linhaTxt: '30%', titulo: 'percentual feminino do FEFC' })), h('div', { class: 'c suave' }, h('p', { class: 'small' }, M.fefcGeneroNota))));
  // repasses
  el.append(h('h3', {}, 'Repasses entre candidaturas'));
  el.append(h('div', { class: 'g', style: 'grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start' },
    h('div', { class: 'c' }, tabela([['De'], [''], ['Para'], ['R$', 'r', true], ['Fonte']], M.repasses.map(r => [[h('b', {}, r.de), r.g === 'F' ? '♀ →' : '♂ →', r.para, nk(brl(r.v), r.v), r.fonte + (r.obs ? ' · ' + r.obs : '')], { cls: r.destaque ? 'dest' : '' }])), fonte('F2 §4 e §5; F3 §5')),
    h('div', {}, h('div', { class: 'c escuro' }, h('h4', {}, 'Os R$ 30.000,00 de Ana Paula a Elaine: três classificações'), tabela([['Registro'], ['Classificação']], M.classificacao30mil.map(r => [r[0], h('b', {}, r[1])])), h('p', { class: 'small', style: 'margin-top:8px' }, 'A presidente estadual declara como Fundo Partidário e confere com o banco; a divergência está na PCE de Elaine. Elaine e Floriano: mesmo município (Imaruí), endereço do tipo "rodovia", e-mail "po", sobrenome Floriano, mesmo militante (Marcos Saraiva) e mesmo fornecedor visual (Esteca Studio). Floriano não mencionou Elaine em nenhuma das 84 publicações.')))));
  // declarado × extrato
  el.append(h('h3', {}, 'Declarado na PCE × extrato bancário'));
  const dv = M.declVsExtrato, maxE = Math.max(...dv.map(d => (d.ext || d.decl + d.omit)));
  el.append(h('div', { class: 'g g2', style: 'align-items:start' }, h('div', { class: 'c' }, barrasH(dv.flatMap(d => [{ label: d.nome + ' – declarado', v: d.decl, cor: COR.t2, txt: brlK(d.decl), on: () => abreDossie(d.nr, 'dinheiro') }, { label: '– fora da PCE', v: d.omit, cor: COR.floresta, forte: true, txt: `${brl(d.omit)} · ${d.nota}`, on: () => abreDossie(d.nr, 'dinheiro') }]), { w: 700, lw: 210, rw: 250, max: maxE, lh: 24 })), h('div', { class: 'c suave' }, h('p', { class: 'small' }, M.declNota), lista(['Floriano: mais de 30 pagamentos de 23 a 25/09, logo após receber o FEFC de Elaine; militantes, combustível e restaurante fora da PCE.', 'Jessica Prado: declara R$ 3.000,00; o banco mostra R$ 29.986,30 (83% do FEFC), com sinais de campanha real.', 'Lu: R$ 10.500,00 a Juarez Santos Cordeiro e R$ 1.900,00 a Carlos Eduardo Morona, que não aparecem em nenhuma base eleitoral.', 'Elaine: R$ 3.500,00 à Agência 47 Hub Criativo e R$ 4.000,00 à Spaco Box em 29/09.']), fonte('F3 §3, §4, §8 e §8-A'))));
  // Matheus
  el.append(h('h3', {}, 'Matheus Hoffmann Machado, Secretário-Geral'));
  el.append(h('div', { class: 'c' }, linhaCurta(M.matheus), h('p', { class: 'small', style: 'margin-top:8px' }, M.matheusNota)));
}
function sankeyLegado() {
  const C = M.legado.clientes.slice().sort((a, b) => b.pago - a.pago), tot = C.reduce((t, c) => t + c.pago, 0);
  const w = 980, H = 400, esc = 220 / tot, xL = 260, xM = 600, xR = 800, gap = 10;
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'fluxo de pagamentos à Legado' });
  let y = 20, yM = (H - tot * esc) / 2;
  C.forEach(c => {
    const hh = c.pago * esc, est = c.cargo === 'Estadual';
    g.append(s('rect', { x: xL - 10, y, width: 10, height: hh, fill: est ? COR.floresta : COR.verde }));
    g.append(s('text', { x: xL - 16, y: y + hh / 2 - 2, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': 600, fill: COR.tinta, text: c.nome }), s('text', { x: xL - 16, y: y + hh / 2 + 13, 'text-anchor': 'end', 'font-size': 11, fill: '#6F7B76', text: `${c.cargo} · ${n0(c.votos)} votos · FEFC ${brlK(c.fefc)}` }));
    g.append(s('path', { d: `M${xL},${y}C${(xL + xM) / 2},${y} ${(xL + xM) / 2},${yM} ${xM},${yM}L${xM},${yM + hh}C${(xL + xM) / 2},${yM + hh} ${(xL + xM) / 2},${y + hh} ${xL},${y + hh}Z`, fill: est ? COR.floresta : COR.verde, 'fill-opacity': .35, tip: `<b>${c.nome} → Legado</b><br>${brl(c.pago)} · ${pct(c.pago / c.fefc * 100)} do FEFC` }));
    g.append(s('text', { x: xL + 8, y: y + hh / 2 + 4, 'font-size': 11.5, 'font-weight': 600, fill: COR.tinta, text: brl(c.pago, 0) }));
    y += hh + gap + 22; yM += hh;
  });
  const yL = (H - tot * esc) / 2;
  g.append(s('rect', { x: xM, y: yL, width: 14, height: tot * esc, fill: COR.floresta }));
  g.append(s('path', { d: `M${xM + 14},${yL}L${xR},${yL + 40}L${xR},${yL + tot * esc - 40}L${xM + 14},${yL + tot * esc}Z`, fill: COR.floresta, 'fill-opacity': .2 }));
  g.append(s('rect', { x: xR, y: yL + 40, width: 12, height: tot * esc - 80, fill: COR.floresta }));
  g.append(s('text', { x: xM + 7, y: yL - 22, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, fill: COR.tinta, text: 'Legado Consultoria' }), s('text', { x: xM + 7, y: yL - 7, 'text-anchor': 'middle', 'font-size': 11, fill: '#6F7B76', text: `${brl(tot)} · aberta em 03/07/2026` }));
  g.append(s('text', { x: xR + 18, y: H / 2 - 6, 'font-size': 12.5, 'font-weight': 600, fill: COR.tinta, text: 'PagSeguro' }), s('text', { x: xR + 18, y: H / 2 + 9, 'font-size': 11, fill: '#6F7B76', text: 'conta 86122337-8' }), s('text', { x: xR + 18, y: H / 2 + 24, 'font-size': 11, fill: '#6F7B76', text: 'destino: sigilo (frente 5)' }));
  return g;
}
function notasLegado() {
  const N = M.legado.notas, cores = { 'Martina Domingues': COR.floresta, 'Cris Quadros': COR.verde, 'Raquel Afonso': COR.menta, 'Melissa Medeiros': COR.cinza, 'Dra. Sandra': '#7FD0B5' };
  const w = 620, H = 210, X = linear(ms('2026-08-28'), ms('2026-09-25'), 30, w - 30);
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'notas fiscais da Legado' });
  [['2026-08-31', '31/08'], ['2026-09-06', '06/09'], ['2026-09-18', '18/09'], ['2026-09-21', '21/09']].forEach(([d, t]) => g.append(s('line', { x1: X(ms(d)), x2: X(ms(d)), y1: 10, y2: H - 30, stroke: COR.t1 }), s('text', { x: X(ms(d)), y: H - 12, 'text-anchor': 'middle', 'font-size': 11, fill: '#6F7B76', text: t })));
  const pilha = {};
  N.forEach(n => { const d = '2026-' + n.data.slice(3, 5) + '-' + n.data.slice(0, 2); pilha[d] = (pilha[d] || 0) + 1; const yy = H - 30 - pilha[d] * 30; const x = X(ms(d)); g.append(s('rect', { x: x - 26, y: yy, width: 52, height: 26, rx: 5, fill: cores[n.tomadora], tip: `<b>NFS-e nº ${n.n}</b><br>${n.tomadora} · ${n.data}${n.hora ? ' às ' + n.hora : ''}<br>${brl(n.v)}${n.obs ? '<br>' + n.obs : ''}` }), s('text', { x, y: yy + 17, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: ["#AEADB3", "#7FD0B5", "#00A170"].includes(cores[n.tomadora]) ? "#0D251A" : "#fff", text: "nº " + n.n + (n.hora ? " · " + n.hora : "") })); });
  return h('div', {}, g, legenda(Object.entries(cores)));
}
function linhaCurta(evs) {
  const w = 900, H = 120, X = linear(0, evs.length - 1, 120, w - 120);
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'sequência de fatos' });
  g.append(s('line', { x1: X(0), x2: X(evs.length - 1), y1: 40, y2: 40, stroke: COR.verde, 'stroke-width': 2 }));
  evs.forEach((e, i) => { g.append(s('circle', { cx: X(i), cy: 40, r: 10 + Math.sqrt(e.v) / 20, fill: i === evs.length - 1 ? COR.floresta : COR.verde, tip: e.t }), s('text', { x: X(i), y: 14, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: COR.tinta, text: dmy(e.d) })); wrapText(g, e.t, X(i), 78, 34, 'middle'); });
  return g;
}
function wrapText(g, t, x, y, maxCh, anchor) { const ws = t.split(' '); let l = '', ln = 0; ws.forEach(w_ => { if ((l + ' ' + w_).trim().length > maxCh) { g.append(s('text', { x, y: y + ln * 14, 'text-anchor': anchor, 'font-size': 11.5, text: l.trim() })); l = w_; ln++; } else l += ' ' + w_; }); if (l.trim()) g.append(s('text', { x, y: y + ln * 14, 'text-anchor': anchor, 'font-size': 11.5, text: l.trim() })); }

// ============================================================ 05 rede
function pgRede(el) {
  cab(el, '05', 'Rede de vínculos', 'Pessoas, empresas e órgãos ligados por pagamentos, cargos, equipe técnica e coincidências');
  el.append(h('p', { class: 'small muted' }, 'Arraste os nós para reorganizar. Clique num nó para ver as ligações e destacar a vizinhança; clique no fundo para limpar. Linha cheia: confirmado em documento. Linha tracejada: homonímia ou inferência.'));
  const TIPO = { pagamento: ['Pagamento', COR.verde, 2], doacao: ['Doação ou repasse', COR.menta, 2], cargo: ['Cargo na direção', COR.floresta, 2.5], socio: ['Sócio', COR.floresta, 1.5], contrato: ['Contrato assinado', COR.tinta, 1.2], equipe: ['Equipe técnica (adv./contab.)', COR.cinza, 1], parentesco: ['Parentesco provável', COR.menta, 1.5], coincidencia: ['Coincidência (nome, telefone, endereço)', '#5B6B65', 1.5], repeticao: ['Repetição entre eleições', '#66A493', 2] };
  const ANC = { orgao: [600, 90], dirigente: [960, 200], legado: [980, 560], equipe: [220, 230], alvo: [470, 440], reserva: [640, 420], cand: [380, 610], federal: [760, 640], homem: [1080, 420], fornecedor: [230, 720], pessoa: [520, 760] };
  const GC = { orgao: COR.floresta, dirigente: COR.verde, legado: COR.floresta, equipe: COR.cinza, alvo: COR.floresta, reserva: COR.verde, cand: COR.verde, federal: COR.verde, homem: COR.cinza, fornecedor: '#fff', pessoa: '#fff' };
  const GN = { orgao: 'Órgão partidário', dirigente: 'Direção estadual', legado: 'Legado e sócios', equipe: 'Equipe jurídica e contábil', alvo: 'Grupo-alvo', reserva: 'Reserva', cand: 'Candidata estadual', federal: 'Candidata federal', homem: 'Candidato homem', fornecedor: 'Fornecedor', pessoa: 'Pessoa física' };
  const W = 1200, H = 830;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nos = M.rede.nos.map(n => ({ ...n, rot: n.r, x: ANC[n.g][0] + (rnd() - .5) * 160, y: ANC[n.g][1] + (rnd() - .5) * 120, vx: 0, vy: 0, r: n.nr && A.fotos[String(n.nr)] ? 20 : n.g === 'orgao' ? 18 : 10 }));
  const ix = Object.fromEntries(nos.map((n, i) => [n.id, i]));
  const ars = M.rede.arestas.map(([a, b, t, c, r]) => ({ a: ix[a], b: ix[b], t, c, r }));
  // força
  for (let it = 0; it < 500; it++) {
    const al = 1 - it / 500;
    for (let i = 0; i < nos.length; i++) for (let j = i + 1; j < nos.length; j++) { const A_ = nos[i], B = nos[j]; let dx = B.x - A_.x, dy = B.y - A_.y, d2 = dx * dx + dy * dy + .01, d = Math.sqrt(d2); const f = 7500 / d2; const min = A_.r + B.r + 26; const extra = d < min ? (min - d) * .5 : 0; dx /= d; dy /= d; A_.vx -= (f + extra) * dx; A_.vy -= (f + extra) * dy; B.vx += (f + extra) * dx; B.vy += (f + extra) * dy; }
    ars.forEach(e => { const A_ = nos[e.a], B = nos[e.b]; const dx = B.x - A_.x, dy = B.y - A_.y, d = Math.sqrt(dx * dx + dy * dy) + .01; const k = e.t === "equipe" ? .003 : .012; const f = (d - 130) * k; A_.vx += f * dx / d; A_.vy += f * dy / d; B.vx -= f * dx / d; B.vy -= f * dy / d; });
    nos.forEach(n => { n.vx += (ANC[n.g][0] - n.x) * .03; n.vy += (ANC[n.g][1] - n.y) * .03; n.x += Math.max(-20, Math.min(20, n.vx * al)); n.y += Math.max(-20, Math.min(20, n.vy * al)); n.vx *= .6; n.vy *= .6; n.x = Math.max(40, Math.min(W - 40, n.x)); n.y = Math.max(30, Math.min(H - 30, n.y)); });
  }
  const filtros = new Set(Object.keys(TIPO));
  const ctl = h('div', { class: 'rede-ctl' }, Object.entries(TIPO).map(([t, [nm, cor]]) => h('label', {}, h('input', { type: 'checkbox', checked: true, on: { change: ev => { ev.target.checked ? filtros.add(t) : filtros.delete(t); aplica(); } } }), h('i', { style: `border-color:${cor}` }), nm)));
  const svgEl = s('svg', { id: 'rede-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'rede de vínculos' });
  const defs = s('defs'); svgEl.append(defs);
  [['seta-p', COR.verde], ['seta-d', COR.menta]].forEach(([id, c]) => defs.append(s('marker', { id, viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, s('path', { d: 'M0,0L10,5L0,10Z', fill: c }))));
  const gE = s('g'), gN = s('g'); svgEl.append(gE, gN);
  const fundo = s('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }); svgEl.insertBefore(fundo, gE);
  const lado = h('div', { class: 'c rede-lado' });
  ars.forEach(e => {
    const [, cor, sw] = TIPO[e.t];
    e.el = s('line', { stroke: cor, 'stroke-width': sw, 'stroke-dasharray': e.c ? (e.t === 'equipe' ? '2 3' : null) : '6 4', 'stroke-opacity': .85, 'marker-end': e.t === 'pagamento' ? 'url(#seta-p)' : e.t === 'doacao' ? 'url(#seta-d)' : null, tip: () => `<b>${nos[e.a].rot} → ${nos[e.b].rot}</b><br>${TIPO[e.t][0]}: ${e.r}${e.c ? '' : '<br><i>inferência ou homonímia</i>'}` });
    gE.append(e.el);
  });
  nos.forEach((n, i) => {
    const g = s('g', { class: 'no' });
    if (n.nr && A.fotos[String(n.nr)]) {
      const cid = 'cl-' + n.id; defs.append(s('clipPath', { id: cid }, s('circle', { cx: 0, cy: 0, r: n.r })));
      g.append(s('circle', { r: n.r + 2.5, fill: n.g === 'alvo' ? COR.floresta : n.g === 'reserva' ? COR.menta : n.g === 'dirigente' ? COR.verde : COR.cinza }), s('image', { href: A.fotos[String(n.nr)], x: -n.r, y: -n.r * 1.25, width: n.r * 2, height: n.r * 2.6, 'clip-path': `url(#${cid})`, preserveAspectRatio: 'xMidYMin slice' }));
    } else g.append(s('circle', { r: n.r, fill: GC[n.g], stroke: ['fornecedor', 'pessoa'].includes(n.g) ? COR.verde : '#fff', 'stroke-width': 1.5 }));
    g.append(s('text', { y: n.r + 13, 'text-anchor': 'middle', 'font-weight': ['alvo', 'reserva', 'legado', 'orgao'].includes(n.g) ? 600 : 400, fill: COR.tinta, text: n.rot.length > 34 ? n.rot.slice(0, 32) + "…" : n.rot }));
    n.el = g; gN.append(g);
    // arrastar
    g.addEventListener('pointerdown', ev => {
      ev.stopPropagation(); g.setPointerCapture(ev.pointerId); let moveu = false;
      const pt = svgEl.createSVGPoint();
      const mv = e2 => { moveu = true; pt.x = e2.clientX; pt.y = e2.clientY; const q = pt.matrixTransform(svgEl.getScreenCTM().inverse()); n.x = q.x; n.y = q.y; posiciona(); };
      const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); if (!moveu) seleciona(i); };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
    });
  });
  fundo.addEventListener('click', () => seleciona(null));
  function posiciona() {
    ars.forEach(e => { const A_ = nos[e.a], B = nos[e.b]; const dx = B.x - A_.x, dy = B.y - A_.y, d = Math.sqrt(dx * dx + dy * dy) || 1; const rb = B.r + 4; e.el.setAttribute('x1', A_.x); e.el.setAttribute('y1', A_.y); e.el.setAttribute('x2', B.x - dx / d * rb); e.el.setAttribute('y2', B.y - dy / d * rb); });
    nos.forEach(n => n.el.setAttribute('transform', `translate(${n.x},${n.y})`));
  }
  let sel = null;
  function aplica() {
    const viz = new Set();
    ars.forEach(e => { const vis = filtros.has(e.t); const lig = sel == null || e.a === sel || e.b === sel; e.el.style.display = vis ? '' : 'none'; e.el.classList.toggle('apagado', !lig); if (vis && lig && sel != null) { viz.add(e.a); viz.add(e.b); } });
    nos.forEach((n, i) => n.el.classList.toggle('apagado', sel != null && !viz.has(i) && i !== sel));
  }
  function seleciona(i) {
    sel = i; aplica(); lado.innerHTML = '';
    if (i == null) { lado.append(h('h4', {}, 'Como ler'), lista(['<b>Centro do circuito</b>: a direção estadual (Presidente, Secretário-Geral e 1º Secretário) liga-se à Legado, a Martina e à presidente pela via das doações.', '<b>Equipe única</b>: o mesmo advogado (Cleiton Pereira) e a mesma contabilista (Jéssica Goetsch) em quase todas as campanhas, pagos pelo diretório via Target.', '<b>Repetições</b>: Carolina Cabral (Mariel 2022, 2024, 2026) e Ana Karina (Kida 2024, 2026).', '<b>Elaine → Floriano</b>: FEFC de mulher para homem, com militante e fornecedor comuns.']), h('h4', {}, 'Grupos'), legenda(Object.entries(GN).map(([g, t]) => [t, GC[g], ['fornecedor', 'pessoa'].includes(g) ? 'border:1.5px solid #006851' : '']))); return; }
    const n = nos[i];
    lado.append(h('div', { style: 'display:flex;gap:10px;align-items:center' }, n.nr ? foto(n.nr) : null, h('div', {}, h("b", {}, n.rot), h("div", { class: "small muted" }, GN[n.g]))));
    if (n.info) lado.append(h('p', { class: 'small', style: 'margin-top:6px' }, n.info));
    if (n.nr && M.cand[String(n.nr)]) lado.append(h('button', { class: 'btn', style: 'margin-top:8px', on: { click: () => abreDossie(n.nr) } }, 'Abrir dossiê'));
    const lig = ars.filter(e => e.a === i || e.b === i);
    lado.append(h('h4', {}, `${lig.length} ligações`), h('div', {}, lig.map(e => { const o = nos[e.a === i ? e.b : e.a]; return h('div', { style: 'padding:6px 0;border-bottom:1px solid #E6F0EE;font-size:12.5px' }, h('span', { class: 'badge', style: `background:${TIPO[e.t][1]};color:${['equipe', 'parentesco', 'repeticao', 'doacao'].includes(e.t) ? '#0D251A' : '#fff'}` }, TIPO[e.t][0]), ' ', h('b', {}, (e.a === i ? "→ " : "← ") + o.rot), h('div', { class: 'muted' }, e.r + (e.c ? '' : ' (inferência)'))); })));
  }
  posiciona(); seleciona(null);
  el.append(ctl, h('div', { class: 'g', style: 'grid-template-columns:minmax(0,3fr) minmax(260px,1fr);align-items:start' }, svgEl, lado));
  el.append(fonte('F2 §2, §3-A, §5 e §6; F3 §1–§9; LMM §4.3; LCR §3 e §4; F6 §3 e §3-A'));
}

// ============================================================ 06 digital
function porDia(series) {
  const ini = ms('2026-08-16'), fim = ms('2026-10-04'), dias = Math.round((fim - ini) / 864e5) + 1;
  const w = 980, lh = 74, lw = 150, H = series.length * lh + 26, bw = (w - lw - 10) / dias;
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'publicações por dia' });
  const maxC = Math.max(...series.map(([, ps]) => { const c = {}; ps.forEach(p => c[p.d] = (c[p.d] || 0) + 1); return Math.max(0, ...Object.values(c)); }), 1);
  series.forEach(([nm, ps, cor], k) => {
    const c = {}, cur = {}; ps.forEach(p => { c[p.d] = (c[p.d] || 0) + 1; cur[p.d] = (cur[p.d] || 0) + (+p.cur); });
    const y0 = k * lh + lh - 8;
    g.append(s('text', { x: lw - 10, y: y0 - 24, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': 600, fill: COR.tinta, text: nm }), s('text', { x: lw - 10, y: y0 - 9, 'text-anchor': 'end', 'font-size': 11, fill: '#6F7B76', text: `${ps.length} coletadas` }), s('line', { x1: lw, x2: w - 10, y1: y0, y2: y0, stroke: COR.fio }));
    for (let i = 0; i < dias; i++) { const d = new Date(ini + i * 864e5).toISOString().slice(0, 10); const v = c[d] || 0; if (!v) continue; const bh = v / maxC * (lh - 20); g.append(s('rect', { x: lw + i * bw + 1, y: y0 - bh, width: Math.max(1, bw - 2), height: bh, fill: cor, tip: `<b>${nm} · ${dmy(d)}</b><br>${v} publicação${v > 1 ? 'ões' : ''} · ${n0(cur[d])} curtidas` })); }
  });
  for (let i = 0; i < dias; i += 7) { const d = new Date(ini + i * 864e5).toISOString().slice(0, 10); g.append(s('text', { x: lw + i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#6F7B76', text: dm(d) })); }
  return g;
}
const VOTO_RE = /\bvot[eoa]r?\b|\bvotem\b|20\.?026|20\.?444|20\.?190|n[úu]mero|confirma\b/i;
function pgDigital(el) {
  cab(el, '06', 'Campanha digital', 'Perfis, anúncios na Meta e as 254 publicações coletadas de 16/08 a 04/10/2026');
  el.append(h('div', { class: 'g g4' }, kpi('2', 'perfis privados e sem anúncio (Mariel e Kida)', 'menta'), kpi('70%', 'das publicações de Martina em horário exato (agendamento)'), kpi('0', 'menções a Elaine nas 84 publicações de Floriano'), kpi('~23', 'anúncios de Floriano não declarados na PCE')));
  el.append(h('h3', {}, 'Quadro dos perfis'));
  el.append(h('div', { class: 'c' }, tabela([['Candidatura'], ['Votos', 'r'], ['Perfil (RRC)'], ['Situação em 24/11'], ['Seguidores / publicações'], ['Campanha visível'], ['Anúncios na Meta'], ['Impulsionamento declarado']], M.perfis.map(p => [[h('div', { style: 'display:flex;gap:8px;align-items:center' }, foto(p.nr, 'p'), h('b', {}, p.nome)), n0(p.votos), p.perfil, h('b', {}, p.sit), p.seg, p.vis, p.meta, p.imp], { cls: /Privado|Removido/.test(p.sit) ? 'dest' : '', on: M.cand[p.nr] ? () => abreDossie(p.nr, 'digital') : null }])), h('div', { class: 'nota' }, M.metodoRedes)));
  const S_ = M.igResumo.map(r => [r.perfil, A.instagram[r.chave], r.chave === 'sargento_floriano' ? COR.cinza : r.chave === 'martina_domingues' ? COR.verde : COR.menta]);
  el.append(h('h3', {}, 'Publicações por dia'));
  el.append(h('div', { class: 'c' }, porDia(S_), h('div', { class: 'nota' }, 'Martina publicou todos os 51 dias, de 2 a 6 vezes por dia; Cris, em 13 dias; Floriano, em 35.')));
  el.append(h('div', { class: 'g g2', style: 'margin-top:14px;align-items:start' }, h('div', { class: 'c' }, h('h4', {}, 'Minuto e segundo de cada publicação'), relogio(S_), h('div', { class: 'nota' }, 'Cada ponto é uma publicação: minuto da hora no eixo horizontal, segundo no vertical. Publicações agendadas por ferramenta saem no minuto exato (08:30:05, 12:00:10…), formando colunas encostadas no topo. Pela F4, 106 das 151 publicações de Martina (70%) saíram assim.')),
    h('div', { class: 'c' }, h('h4', {}, 'Curtidas por publicação'), curtidas(S_), h('div', { class: 'nota' }, 'Escala logarítmica. Medianas pela F4: Cris 8, Martina 2, Floriano 60.'))));
  el.append(h('div', { class: 'c suave', style: 'margin-top:14px' }, h('div', { class: 'g g3' }, M.igResumo.map(r => h('div', {}, h('h4', {}, r.perfil), tabela([['Indicador'], ['Valor', 'r']], [['Publicações de campanha', r.pub], ['Dias com publicação', r.dias], ['Curtidas (mediana)', r.med], ['Com pedido de voto ou número', r.voto], ['Em horário "redondo"', r.redondo]]))))), fonte('F4 §2-A'));
  el.append(h('div', { class: 'g g2', style: 'margin-top:14px' }, h('div', { class: 'c' }, h('h4', {}, 'Leitura por perfil'), lista(['<b>Cris</b>: campanha a partir de 17/08 ("Sou candidata a Deputada Estadual"), pauta de inclusão, carrosséis com 20.026 nas duas últimas semanas, vídeo com a presidente estadual em 21/08. Alcance quase nulo.', '<b>Martina</b>: produzida em série (provavelmente pela Like Business), educação, valores e memes; alinhamento com Carol de Toni e Carlos Bolsonaro; "colinhas" com Dra. Sandra.', '<b>Floriano</b>: engajamento real, Joinville, segurança pública; apoio a Jorginho Mello, Carol de Toni e aos Bolsonaro. Nenhuma menção a Elaine: não há sinal público de campanha conjunta que justifique o repasse.'])),
    h('div', { class: 'c escuro' }, h('h4', {}, 'Preservação da prova'), h('p', {}, 'O perfil de Elaine já desapareceu. Recomenda-se ata notarial imediata: perfis de Mariel e Kida (privados, bio), páginas de Cris e Floriano e as buscas na Biblioteca de Anúncios das quatro candidatas. Os anúncios ficam sete anos na biblioteca; os perfis podem mudar a qualquer momento.'), h('p', { class: 'small', style: 'margin-top:8px' }, 'Observação lateral: Cris se apresenta como estagiária na ALESC e Kida como "Estagiária SMSOP"; lotação e vínculo não verificados.'))));
  // tabela de publicações
  el.append(h('h3', {}, 'Todas as publicações coletadas'));
  const todas = []; M.igResumo.forEach(r => A.instagram[r.chave].forEach(p => todas.push({ ...p, perfil: r.perfil })));
  let filtro = 'todas', termo = '';
  const chips = h('div', { class: 'chips' }, ['todas', ...M.igResumo.map(r => r.perfil), 'com pedido de voto'].map(t => h('button', { class: 'chip' + (t === 'todas' ? ' on' : ''), on: { click: ev => { filtro = t; $$('.chip', chips).forEach(b => b.classList.toggle('on', b === ev.target)); desenha(); } } }, t)));
  const busca = h('input', { type: 'search', class: 'sel', placeholder: 'Filtrar pela legenda…', style: 'max-width:320px;display:block', on: { input: ev => { termo = norm(ev.target.value); desenha(); } } });
  const box = h('div'), cont = h('div', { class: 'small muted', style: 'margin:6px 0' });
  function desenha() {
    const l = todas.filter(p => (filtro === 'todas' || p.perfil === filtro || (filtro === 'com pedido de voto' && VOTO_RE.test(p.leg))) && (!termo || norm(p.leg).includes(termo)));
    cont.textContent = `${l.length} publicações`;
    box.innerHTML = '';
    box.append(tabela([['Perfil'], ['Data'], ['Hora'], ['Tipo'], ['Curtidas', 'r', true], ['Coment.', 'r', true], ['Voto/nº'], ['Legenda'], ['']], l.map(p => [p.perfil, nk(dmy(p.d), p.d), p.h, p.tipo.replace(/\/\d+$/, ''), nk(n0(p.cur), p.cur), nk(n0(p.com), p.com), VOTO_RE.test(p.leg) ? '●' : '', h('span', { tip: p.leg.replace(/</g, '&lt;') || '(sem legenda)' }, Array.from(p.leg).length > 140 ? Array.from(p.leg).slice(0, 140).join('') + '…' : p.leg), h('a', { href: p.url, target: '_blank', rel: 'noopener' }, 'abrir')])));
  }
  desenha();
  el.append(h('div', { class: 'c' }, chips, busca, cont, h('div', { style: 'max-height:620px;overflow:auto' }, box), h('div', { class: 'nota' }, 'A coluna "Voto/nº" é uma marcação automática por palavras-chave (voto, número da candidatura); os números oficiais estão no quadro acima (F4). Os links abrem o Instagram e exigem internet.')));
}
function relogio(S_) {
  const w = 900, cada = 290, H = 250, g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'minuto e segundo das publicações' });
  S_.forEach(([nm, ps, cor], k) => {
    const x0 = k * (cada + 15) + 30, X = linear(0, 59, x0, x0 + cada - 30), Y = linear(0, 59, 40, H - 30);
    g.append(s('rect', { x: x0, y: 40, width: cada - 30, height: H - 70, fill: COR.t3 }), s('text', { x: x0, y: 22, 'font-size': 12.5, 'font-weight': 600, fill: COR.tinta, text: nm }));
    [0, 15, 30, 45].forEach(m => g.append(s('line', { x1: X(m), x2: X(m), y1: 40, y2: H - 30, stroke: '#fff' }), s('text', { x: X(m), y: H - 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#6F7B76', text: ':' + String(m).padStart(2, '0') })));
    g.append(s('text', { x: x0 - 4, y: 44, 'text-anchor': 'end', 'font-size': 9.5, fill: '#6F7B76', text: 's0' }), s('text', { x: x0 - 4, y: H - 30, 'text-anchor': 'end', 'font-size': 9.5, fill: '#6F7B76', text: '59' }));
    ps.forEach(p => { const [hh, mm, ss] = p.h.split(':').map(Number); g.append(s('circle', { cx: X(mm) + (Math.sin(ss * 7 + hh) * 1.5), cy: Y(ss), r: 3.2, fill: cor, 'fill-opacity': .75, tip: `${dmy(p.d)} ${p.h}` })); });
  });
  return g;
}
function curtidas(S_) {
  const w = 640, H = 220, X = logS(1, 400, 140, w - 20), g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'curtidas' });
  [1, 3, 10, 30, 100, 300].forEach(v => g.append(s('line', { x1: X(v), x2: X(v), y1: 10, y2: H - 26, stroke: COR.t1 }), s('text', { x: X(v), y: H - 10, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#6F7B76', text: v })));
  S_.forEach(([nm, ps, cor], k) => {
    const y = 40 + k * 62; g.append(s('text', { x: 130, y: y + 4, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': 600, fill: COR.tinta, text: nm }));
    const v = ps.map(p => +p.cur).sort((a, b) => a - b), med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    ps.forEach((p, i) => g.append(s('circle', { cx: X(Math.max(1, +p.cur)), cy: y + ((i * 37) % 23) - 11, r: 3, fill: cor, 'fill-opacity': .6, tip: `${dmy(p.d)} · ${p.cur} curtidas` })));
    g.append(s('line', { x1: X(Math.max(1, med)), x2: X(Math.max(1, med)), y1: y - 18, y2: y + 18, stroke: COR.floresta, 'stroke-width': 2.5 }), s('text', { x: X(Math.max(1, med)) + 5, y: y - 14, 'font-size': 10.5, fill: COR.floresta, text: 'mediana ' + n0(med) }));
  });
  return g;
}

// ============================================================ 07 histórico
function pgHistorico(el) {
  cab(el, '07', 'Histórico 2022–2026', 'As mesmas candidatas, o mesmo partido, o mesmo padrão');
  el.append(h('div', { class: 'alerta forte' }, h('b', {}, 'Candidatura reiterada para compor a cota. '), 'Mariel (2022, 2024 e 2026) e Kida (2024 e 2026) repetem a fórmula: financiamento padronizado pelo partido, gasto integral com poucas pessoas físicas, nenhuma propaganda e votação ínfima. A fraude não depende só de 2026: é um padrão reiterado do PODE com as mesmas candidatas.'));
  const w = 700, H = 440, Y = linear(0, 760, H - 30, 20), xa = 210, xb = 490;
  const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'votos 2024 e 2026' });
  g.append(s('text', { x: xa, y: 14, 'text-anchor': 'middle', 'font-weight': 600, fill: COR.tinta, text: '2024 (vereadora)' }), s('text', { x: xb, y: 14, 'text-anchor': 'middle', 'font-weight': 600, fill: COR.tinta, text: '2026 (dep. estadual)' }));
  g.append(s('line', { x1: xa, x2: xa, y1: 20, y2: H - 30, stroke: COR.fio }), s('line', { x1: xb, x2: xb, y1: 20, y2: H - 30, stroke: COR.fio }));
  const ocup = { a: [], b: [] }; const livre = (arr, y) => { let yy = y; while (arr.some(v => Math.abs(v - yy) < 13)) yy -= 13; arr.push(yy); return yy; };
  M.hist2426.slice().sort((a, b) => a.v24 - b.v24).forEach(r => { const fo = [20522, 20999].includes(r.nr), re = r.nr === 20444; const cor = fo ? COR.floresta : re ? COR.menta : COR.t2;
    g.append(s('line', { x1: xa, y1: Y(r.v24), x2: xb, y2: Y(r.v26), stroke: cor, 'stroke-width': fo ? 3.5 : 2, tip: `<b>${r.nome}</b><br>2024: ${r.v24} votos (${r.p24})<br>2026: ${r.v26} votos` }), s('circle', { cx: xa, cy: Y(r.v24), r: 4.5, fill: cor }), s('circle', { cx: xb, cy: Y(r.v26), r: 4.5, fill: cor }));
    g.append(s('text', { x: xa - 10, y: livre(ocup.a, Y(r.v24) + 4), 'text-anchor': 'end', 'font-size': 11.5, 'font-weight': fo ? 600 : 400, fill: COR.tinta, text: `${r.nome} ${r.v24}` }), s('text', { x: xb + 10, y: livre(ocup.b, Y(r.v26) + 4), 'font-size': 11.5, 'font-weight': fo ? 600 : 400, fill: COR.tinta, text: `${r.v26} ${r.nome}` })); });
  el.append(h('div', { class: 'g', style: 'grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start' }, h('div', { class: 'c' }, h('h4', {}, 'Votos em 2024 e 2026'), g, h('div', { class: 'nota' }, 'As demais cresceram de 2024 para 2026, com campanhas compatíveis com candidaturas reais. Abia Alves foi candidata a vice-prefeita em 2024.')), h('div', { class: 'c suave' }, lista(M.histNotas), fonte('F6 §1–§5'))));
  // Mariel e Kida lado a lado
  el.append(h('h3', {}, 'Mariel e Kida em cada eleição'));
  el.append(h('div', { class: 'g g2', style: 'align-items:start' }, [20522, 20999].map(nr => { const c = M.cand[nr]; return h('div', { class: 'c' }, h('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:8px' }, foto(nr), h('b', {}, nome(nr))), tabela([['Ano'], ['Votos', 'r'], ['FEFC', 'r'], ['Pessoal'], ['Contas']], c.hist.map(x => [h('b', {}, x.ano), n0(x.votos), brl(x.fefc), x.pessoal, x.contas])), c.hist.map(x => h('p', { class: 'small', style: 'margin-top:6px' }, h('b', {}, x.ano + ': '), x.detalhe))); })));
  // recorrentes
  el.append(h('h3', {}, 'Pessoas e profissionais que voltam'));
  const anos = [2022, 2024, 2026], w2 = 760, H2 = M.recorrentes.length * 40 + 40, X2 = i => 330 + i * 160;
  const g2 = s('svg', { viewBox: `0 0 ${w2} ${H2}`, role: 'img', 'aria-label': 'pessoas recorrentes' });
  anos.forEach((a, i) => g2.append(s('text', { x: X2(i), y: 16, 'text-anchor': 'middle', 'font-weight': 600, fill: COR.tinta, text: a })));
  M.recorrentes.forEach((r, k) => { const y = 44 + k * 40; g2.append(s('text', { x: 300, y: y + 4, 'text-anchor': 'end', 'font-size': 12.5, fill: COR.tinta, text: `${r.pessoa} – ${r.quem}` }), s('line', { x1: X2(0), x2: X2(2), y1: y, y2: y, stroke: COR.t1 })); const pres = r.anos.map(a => anos.indexOf(a[0])); if (pres.length > 1) g2.append(s('line', { x1: X2(Math.min(...pres)), x2: X2(Math.max(...pres)), y1: y, y2: y, stroke: COR.verde, 'stroke-width': 2 })); r.anos.forEach(([a, v]) => g2.append(s('circle', { cx: X2(anos.indexOf(a)), cy: y, r: v ? Math.min(13, 6 + Math.sqrt(v) / 12) : 7, fill: v ? COR.verde : '#fff', stroke: COR.verde, 'stroke-width': 2, tip: `<b>${r.pessoa}</b> · ${a}<br>${v ? brl(v) : 'atuação (sem valor)'}` }))); });
  el.append(h('div', { class: 'c' }, g2, h('div', { class: 'nota' }, 'Círculo cheio: pagamento (área proporcional ao valor). Círculo vazado: atuação como advogado.'), fonte('F6 §3 e §3-A; LM §4.3; F3 §7')));
  el.append(h('div', { class: 'alerta' }, h('b', {}, 'Kida, 2024. '), 'O parecer conclusivo da 100ª ZE registrou: "Há despesas de R$ 2.000,00 em panfletagem, por duas pessoas, sem nenhum registro de material de publicidade ou doação estimável em dinheiro de materiais de campanha." Em 2026, Kida repete o padrão – e já não há candidato majoritário a quem atribuir o material.'));
}

// ============================================================ 08 direção
function pgDirecao(el) {
  cab(el, '08', 'Direção estadual', 'Composição do órgão provisório do PODE/SC (certidão do SGIP de 24/11/2026)');
  el.append(h('p', { class: 'small muted' }, M.sgip.emissao));
  el.append(legenda([['ligação central com o caso', COR.floresta], ['ligação relevante', COR.t2], ['ligação indireta', COR.t3], ['sem ocorrência', '#fff', 'border:1px solid #C8D5CF']]));
  el.append(h('div', { class: 'org' }, M.sgip.membros.map(m => h('div', { class: 'm d' + m.d, style: m.nr ? 'cursor:pointer' : '', on: m.nr && M.cand[String(m.nr)] ? { click: () => abreDossie(m.nr) } : null }, m.nr && A.fotos[String(m.nr)] ? foto(m.nr, 'p') : null, h('div', {}, h('div', { class: 'cg' }, m.cargo), h('b', {}, m.nome), h('p', {}, m.lig))))));
  el.append(h('div', { class: 'g g2', style: 'margin-top:16px' }, h('div', { class: 'c escuro' }, h('h4', {}, 'Coincidências de contato'), lista(M.sgip.coincidencias)), h('div', { class: 'c suave' }, h('h4', {}, 'Leitura'), lista(['<b>Isaac Pacheco Silva</b>: o nome do sócio da Legado ocupa a Primeira Secretaria. Confirmado o CPF, o circuito passa a ser FEFC de candidatas pago a empresa de dirigente estadual.', '<b>Matheus Hoffmann Machado</b>: a dívida que impedia a candidatura de Martina foi paga pelo Secretário-Geral, um dia depois de doar à campanha da presidente.', '<b>Ana Paula da Silva</b>: recebeu do Secretário-Geral e da Tesoureira e originou os R$ 30.000,00 que passaram por Elaine.', '<b>Cristiane Marta Loureiro</b> (PODEMOS Mulher): testemunha natural sobre o recrutamento das candidatas.', '<b>Lucas Lucindo Vieira e Pedro Santacannabis</b>, dirigentes e suplentes da chapa, seriam atingidos pela queda.']), fonte(M.sgip.fonte))));
}

// ============================================================ 09 linha do tempo
function pgTempo(el) {
  cab(el, '09', 'Linha do tempo', 'Fatos de 2020 a 24/11/2026, por faixa');
  const F = { cand: 'Candidaturas', direcao: 'Direção estadual', legado: 'Legado', equipe: 'Equipe do partido', dinheiro: 'Dinheiro', justica: 'Justiça Eleitoral' };
  const TAGS = [['todos', 'Todos'], ['mariel', 'Mariel'], ['kida', 'Kida'], ['martina', 'Martina'], ['cris', 'Cris'], ['floriano', 'Floriano e Elaine'], ['legado', 'Legado'], ['matheus', 'Matheus'], ['isaac', 'Isaac']];
  let tag = 'todos', modo = 'campanha';
  const chips = h('div', { class: 'chips' }, TAGS.map(([t, n]) => h('button', { class: 'chip' + (t === 'todos' ? ' on' : ''), on: { click: ev => { tag = t; $$('.chip', chips).forEach(b => b.classList.toggle('on', b === ev.target)); desenha(); } } }, n)));
  const modos = h('div', { class: 'chips' }, [['campanha', 'Julho a novembro de 2026'], ['tudo', '2020 a 2026']].map(([m, n]) => h('button', { class: 'btn' + (m === modo ? ' on' : ''), on: { click: ev => { modo = m; $$('.btn', modos).forEach(b => b.classList.toggle('on', b === ev.target)); desenha(); } } }, n)));
  const box = h('div', { class: 'c' }), lst = h('div', { class: 'ev-lista' });
  function passa(e) { return tag === 'todos' || e.q.includes(tag) || (tag === 'floriano' && e.q.includes('elaine')); }
  function desenha() {
    const ini = modo === 'campanha' ? '2026-07-01' : '2020-01-01', fim = '2026-11-28';
    const evs = M.eventos.filter(e => e.d >= ini);
    const w = 1100, lw = 150, lane = 52, H = Object.keys(F).length * lane + 40, X = linear(ms(ini), ms(fim), lw, w - 20);
    const g = s('svg', { viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': 'linha do tempo' });
    const tk = modo === 'campanha' ? ['2026-07-01', '2026-08-01', '2026-08-16', '2026-09-01', '2026-09-15', '2026-10-04', '2026-11-01', '2026-11-24'] : ['2020-01-01', '2022-01-01', '2024-01-01', '2025-01-01', '2026-01-01', '2026-07-01'];
    tk.forEach(d => g.append(s('line', { x1: X(ms(d)), x2: X(ms(d)), y1: 10, y2: H - 26, stroke: d === '2026-10-04' ? COR.floresta : COR.t1, 'stroke-width': d === '2026-10-04' ? 1.5 : 1 }), s('text', { x: X(ms(d)), y: H - 8, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#6F7B76', text: modo === 'campanha' ? dm(d) : d.slice(0, 4) })));
    if (modo === 'campanha') g.append(s('rect', { x: X(ms('2026-08-16')), y: 10, width: X(ms('2026-10-04')) - X(ms('2026-08-16')), height: H - 36, fill: COR.t3, 'fill-opacity': .6 }), s('text', { x: X(ms('2026-08-16')) + 4, y: 22, 'font-size': 10.5, fill: COR.tinta, text: 'campanha' }));
    Object.entries(F).forEach(([f, nm], i) => { const y = 20 + i * lane + lane / 2; g.append(s('text', { x: lw - 10, y: y + 4, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 500, fill: COR.tinta, text: nm }), s('line', { x1: lw, x2: w - 20, y1: y, y2: y, stroke: COR.fio }));
      const cont = {}; evs.filter(e => e.f === f).forEach(e => { const k = e.d.slice(0, modo === 'campanha' ? 10 : 7); cont[k] = (cont[k] || 0) + 1; const on = passa(e); g.append(s('circle', { cx: X(ms(e.d)), cy: y + (cont[k] - 1) * 8 - 6, r: on ? 6.5 : 4, fill: on ? (tag === 'todos' ? COR.verde : COR.floresta) : COR.t2, stroke: '#fff', tip: `<b>${dmy(e.d)}</b><br>${e.t}` })); }); });
    box.innerHTML = ''; box.append(g);
    lst.innerHTML = '';
    evs.filter(passa).forEach(e => lst.append(h('div', { class: 'ev' }, h('span', { class: 'd' }, dmy(e.d)), h('span', { class: 'f muted small' }, F[e.f]), h('span', {}, e.t))));
  }
  el.append(modos, chips, box, h('h3', {}, 'Lista dos fatos'), lst, fonte('Todos os relatórios da pasta 07'));
  desenha();
}

// ============================================================ 10 decisão
function pgDecisao(el) {
  cab(el, '10', 'Decisão e próximos passos', 'O que já se tem, o que falta, o que a defesa vai usar');
  el.append(h('div', { class: 'g g4' }, M.provado.map(p => { const nr = { Mariel: 20522, Kida: 20999, Martina: 20444, Cris: 20026 }[p.quem]; return h('div', { class: 'c' + (['Mariel', 'Kida'].includes(p.quem) ? ' escuro' : '') }, h('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:8px' }, foto(nr, 'p'), h('div', {}, h('b', {}, nome(nr)), h('div', {}, badge(M.cand[nr].tipo)))), h('div', { class: 'rot', style: ['Mariel', 'Kida'].includes(p.quem) ? 'color:#BFD9D4' : '' }, 'Já documentado'), lista(p.ok), h('div', { class: 'rot', style: 'margin-top:8px;' + (['Mariel', 'Kida'].includes(p.quem) ? 'color:#BFD9D4' : '') }, 'Falta'), lista(p.falta)); })));
  el.append(h('div', { class: 'g g2', style: 'margin-top:16px;align-items:start' },
    h('div', { class: 'c' }, h('h4', {}, 'Frente 5 – provas que dependem da ação e medidas urgentes'), h('div', {}, M.frente5.map(f => h('div', { style: 'display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #E6F0EE;font-size:13px' }, h('span', { class: 'badge' + (f.st === 'recomendada' ? ' reserva' : '') }, f.st), h('span', {}, f.t))))),
    h('div', { class: 'c suave' }, h('h4', {}, 'O que a defesa vai usar'), M.defesa.map(d => h('div', { style: 'padding:6px 0;border-bottom:1px solid #CCE1DC' }, h('b', {}, d.t), h('div', { class: 'small' }, d.d), h('div', { class: 'fonte', style: 'margin-top:2px' }, d.f))))));
  el.append(h('h3', {}, 'Pendências de todas as frentes'));
  el.append(h('div', { class: 'c' }, tabela([['Frente'], ['Situação'], ['Pendência']], M.frentes.flatMap(f => f.pendente.map(p => [`${f.n} – ${f.titulo}`, f.situacao, p])))));
  el.append(h('div', { class: 'g g2', style: 'margin-top:16px' }, h('div', { class: 'c' }, h('h4', {}, 'Limites do levantamento'), lista(M.limites)), h('div', { class: 'c escuro' }, h('h4', {}, 'Consequência e conveniência'), h('p', {}, M.chapa.consequencia), h('p', { style: 'margin-top:8px' }, M.chapa.politica))));
}

// ============================================================ 11 fontes
function pgFontes(el) {
  cab(el, '11', 'Fontes', 'Documentos da pasta 07 e bases consultadas');
  el.append(h('div', { class: 'c' }, tabela([['Sigla'], ['Documento'], ['Data'], ['']], M.fontes.map(f => [h('b', {}, f.sigla), f.doc, f.data, h('span', {}, h('a', { href: '../' + f.doc, target: '_blank' }, 'abrir'), f.pdf ? h('span', {}, ' · ', h('a', { href: '../' + f.doc.replace(/\.md$/, '.pdf'), target: '_blank' }, 'PDF')) : null)])), h('div', { class: 'nota' }, 'Os links abrem os arquivos na pasta 07 (um nível acima deste painel).')));
  el.append(h('div', { class: 'c', style: 'margin-top:14px' }, h('h4', {}, 'Bases'), lista(M.bases)));
  el.append(h('div', { class: 'c suave', style: 'margin-top:14px' }, h('h4', {}, 'Como este painel foi gerado'), lista(['Dados automáticos (métricas de votação, votos por município e local, voto na própria seção, fotos de urna, publicações do Instagram e malha municipal): <code>_scripts/02_painel_dados.pl</code>, com conferências que interrompem a geração se os números divergirem dos relatórios.', 'Fatos dos relatórios: <code>dados/dados_manuais.js</code>, com a fonte de cada bloco.', 'Montagem: <code>_scripts/03_painel_html.pl</code> (fonte Outfit, logos e dados embutidos; funciona sem internet).', 'CPFs de pessoas físicas aparecem mascarados.'])));
}

// ============================================================ busca e seletor
function indice() {
  const I = [];
  Object.entries(M.cand).forEach(([nr, c]) => { I.push({ t: nome(nr), s: `Dossiê · ${c.cargo} · nº ${nr}`, k: norm(nome(nr) + ' ' + ((A.cand[nr] || {}).nome || '') + ' ' + nr), go: () => abreDossie(nr) }); (c.processos || []).forEach(p => I.push({ t: p[1], s: `${p[0]} · ${nome(nr)}`, k: norm(p[1] + ' ' + p[0]), go: () => abreDossie(nr, 'ident') })); (c.despesas || []).forEach(d => I.push({ t: d.quem, s: `Despesa de ${nome(nr)} · ${brl(d.pag.reduce((t, x) => t + x[1], 0))}`, k: norm(d.quem + ' ' + (d.obj || '')), go: () => abreDossie(nr, 'dinheiro') })); });
  M.rede.nos.forEach(n => I.push({ t: n.r, s: 'Rede de vínculos', k: norm(n.r), go: () => { vai('rede'); } }));
  M.sgip.membros.forEach(m => I.push({ t: m.nome, s: 'Direção estadual · ' + m.cargo, k: norm(m.nome + ' ' + m.cargo), go: () => vai('direcao') }));
  M.eventos.forEach(e => I.push({ t: e.t, s: 'Linha do tempo · ' + dmy(e.d), k: norm(e.t), go: () => vai('tempo') }));
  I.push({ t: 'Legado Consultoria', s: 'Dinheiro · circuito da Legado', k: norm('legado consultoria isaac caue pagseguro 67.851.320'), go: () => vai('dinheiro') });
  I.push({ t: 'Target Gestão Estratégica', s: 'Dinheiro · diretório estadual', k: norm('target wanderlinde cleiton pereira 29.937.484'), go: () => vai('dinheiro') });
  return I;
}
function iniciaBusca() {
  const I = indice(), inp = $('#busca'), res = $('#busca-res'); let lst = [], at = 0;
  const mostra = () => { res.innerHTML = ''; lst.forEach((r, i) => res.append(h('div', { class: i === at ? 'ativo' : '', on: { mousedown: ev => { ev.preventDefault(); escolhe(i); } } }, r.t, h('small', {}, r.s)))); res.classList.toggle('on', lst.length > 0); };
  const escolhe = i => { const r = lst[i]; if (!r) return; res.classList.remove('on'); inp.value = ''; inp.blur(); r.go(); };
  inp.addEventListener('input', () => { const q = norm(inp.value.trim()); if (q.length < 2) { lst = []; mostra(); return; } const ts = q.split(/\s+/); lst = I.filter(r => ts.every(t => r.k.includes(t))).slice(0, 14); at = 0; mostra(); });
  inp.addEventListener('keydown', ev => { if (ev.key === 'ArrowDown') { at = Math.min(at + 1, lst.length - 1); mostra(); ev.preventDefault(); } else if (ev.key === 'ArrowUp') { at = Math.max(at - 1, 0); mostra(); ev.preventDefault(); } else if (ev.key === 'Enter') escolhe(at); else if (ev.key === 'Escape') { res.classList.remove('on'); } });
  inp.addEventListener('blur', () => setTimeout(() => res.classList.remove('on'), 150));
  const sel = $('#sel-cand');
  sel.append(h('option', { value: '' }, 'Abrir dossiê…'));
  [['Grupo-alvo e reserva', ['alvo', 'reserva']], ['Demais mulheres da chapa', ['fora']], ['Contrapontos, direção e federais', ['contraponto', 'dirigente', 'federal']]].forEach(([t, tipos]) => sel.append(h('optgroup', { label: t }, Object.entries(M.cand).filter(([, c]) => tipos.includes(c.tipo)).sort((a, b) => ((MET[a[0]] || {}).votos || 1e9) - ((MET[b[0]] || {}).votos || 1e9)).map(([nr]) => h('option', { value: nr }, `${nome(nr)} (${nr})`)))));
  sel.addEventListener('change', () => { if (sel.value) abreDossie(sel.value); });
}

// ============================================================ início
function inicia() {
  const nav = $('#nav'), main = $('#main');
  PAGINAS.forEach(([id, t], i) => { nav.append(h('a', { href: '#' + id, 'data-id': id, on: { click: ev => { ev.preventDefault(); dossieNr = null; vai(id); } } }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), t)); main.append(h('section', { class: 'pg', id: 'pg-' + id })); });
  nav.append(h('div', { class: 'ressalva' }, M.meta.ressalva), h('div', { class: 'base' }, 'DRAP ' + M.meta.drap, h('br'), 'Data-base ' + M.meta.database));
  $('#menu-btn').addEventListener('click', () => nav.classList.toggle('aberto'));
  iniciaBusca();
  const hs = location.hash.slice(1);
  if (/^c-\d+$/.test(hs)) abreDossie(hs.slice(2)); else vai(hs || mem.get('pg') || 'visao');
  window.addEventListener('beforeprint', () => PAGINAS.forEach(p => monta(p[0])));
  window.__ok = true;
}
document.addEventListener('DOMContentLoaded', inicia);
