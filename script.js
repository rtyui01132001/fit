
const $ = s => document.querySelector(s), DAY = 864e5, CI = '一二三四五六七八九十';
const DG = { name: '小愛健康日記', target: '', step: 1, minK: 1390, minP: 85, water: 2000, types: { w: { name: '平日', tdee: 1780, lo: 1480, hi: 1530, pl: 90, ph: 100 }, r: { name: '超慢跑日', tdee: 1900, lo: 1600, hi: 1650, pl: 95, ph: 105 }, s: { name: '游泳日', tdee: 2050, lo: 1750, hi: 1800, pl: 95, ph: 105 } } };
const emptyState = () => ({ w: {}, f: [], ib: [], ex: [], dt: {}, wa: {}, g: JSON.parse(JSON.stringify(DG)) });
let S = emptyState();
const mergeG = g => { const o = Object.assign(JSON.parse(JSON.stringify(DG)), g || {}); if (!o.name || o.name === '小愛') o.name = '小愛健康日記'; return o };
const validateState = data => {
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!record(data) || !record(data.w) || !Array.isArray(data.f) || !Array.isArray(data.ib) || !record(data.g) ||
    (data.wa !== undefined && !record(data.wa)) || (data.dt !== undefined && !record(data.dt)) ||
    (data.ex !== undefined && !Array.isArray(data.ex))) throw new Error('Invalid diary data');
  if (Object.values(data.w).some(v => typeof v !== 'number' || !Number.isFinite(v)) ||
    [...data.f, ...data.ib].some(v => !record(v) || typeof v.date !== 'string')) throw new Error('Invalid records');
};
const hydrateState = data => {
  validateState(data);
  const next = Object.assign(emptyState(), data);
  next.g = mergeG(data.g);
  next.g.types = Object.fromEntries(Object.entries(DG.types).map(([key, defaults]) =>
    [key, Object.assign({}, defaults, data.g.types?.[key] || {})]));
  S = next;
};
let store = null, readyToSave = false, saveQueue = Promise.resolve(), dirty = false, revision = 0;
const storageStatus = text => { $('#storageStatus').textContent = text; };
const editLock = locked => {
  document.querySelectorAll('main input, main select, main button, main textarea').forEach(el => {
    if (!el.closest('#cloudConnection') && !['jsonExport','bk'].includes(el.id)) el.disabled = locked;
  });
};
const save = () => {
  dirty = true;
  const version = ++revision, snapshot = JSON.parse(JSON.stringify(S));
  storageStatus('等待儲存至 GitHub…');
  saveQueue = saveQueue.then(async () => {
    if (version !== revision) return true;
    if (!readyToSave || !store) { storageStatus('請先連線並讀取線上 data.json'); return false; }
    try {
      await store.write(snapshot);
      if (version === revision) {
        dirty = false;
        storageStatus('已儲存至 GitHub data.json · ' + new Date().toLocaleTimeString('zh-TW'));
      }
      return true;
    } catch (e) {
      storageStatus('儲存失敗：' + e.message + '。目前修改仍在分頁中，可匯出 JSON 備份或按「重試儲存」。');
      return false;
    }
  });
  return saveQueue;
};
const loadJsonState = async () => {
  if (dirty && !confirm('目前有尚未儲存的修改，重新讀取會取代它們。請先匯出備份，確定繼續？')) return;
  $('#cloudConnect').disabled = true;
  editLock(true);
  readyToSave = false;
  await saveQueue;
  try {
    const candidate = new GitHubDiaryStore({owner:$('#cloudOwner').value.trim(),repo:$('#cloudRepo').value.trim(),
      branch:$('#cloudBranch').value.trim(),path:$('#cloudPath').value.trim(),token:$('#cloudToken').value.trim() || store?.token});
    storageStatus('正在讀取 GitHub data.json…');
    const data = await candidate.read();
    hydrateState(data);
    store = candidate; readyToSave = true; dirty = false;
    $('#cloudToken').value = '';
    fillG(); setDay(day); renderAll();
    editLock(false);
    storageStatus('已讀取線上 data.json；修改後會儲存至 GitHub。換裝置或回到此頁時，請按「連線／重新讀取」。');
  } catch (e) {
    storageStatus('連線失敗：' + e.message + '。請檢查設定，線上原檔未修改。');
  } finally { $('#cloudConnect').disabled = false; }
};
const exportJsonFile = () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  if ($('#jsonRes')) $('#jsonRes').textContent = '已匯出 JSON';
};
const importJsonFile = async (file) => {
  if (!file || !readyToSave) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    validateState(data);
    if (!confirm('匯入會取代線上 data.json 的全部紀錄，確定繼續？')) return;
    hydrateState(data);
    fillG();
    persist();
    if ($('#jsonRes')) $('#jsonRes').textContent = await saveQueue ? '已匯入並儲存 JSON' : '已載入，儲存失敗，請保留原始備份';
  } catch (e) {
    if ($('#jsonRes')) $('#jsonRes').textContent = 'JSON 格式不正確';
    console.warn('Invalid JSON data', e);
  }
};
const tdy = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) };
const ts = d => Date.parse(d + 'T00:00:00Z'), ds = t => new Date(t).toISOString().slice(0, 10);
const n0 = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n }, r1 = n => Math.round(n * 10) / 10;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sgn = n => (n > 0 ? '+' : '') + r1(n), cd = i => CI[i] || '#' + (i + 1);
let day = tdy(), cal = day.slice(0, 7);

function weights() {
  const a = Object.entries(S.w).filter(([d, v]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(ts(d)) && Number.isFinite(v)).sort().map(([d, v]) => ({ d, v, t: ts(d) }));
  a.forEach(x => { const w = a.filter(y => y.t <= x.t && y.t > x.t - 7 * DAY); x.tr = w.reduce((s, y) => s + y.v, 0) / w.length });
  return a;
}
function star(cx, cy, r) { let p = ''; for (let i = 0; i < 10; i++) { const g = (-90 + i * 36) * Math.PI / 180, k = i % 2 ? r * .42 : r; p += (cx + k * Math.cos(g)).toFixed(1) + ',' + (cy + k * Math.sin(g)).toFixed(1) + ' ' } return `<polygon points="${p}" fill="var(--st)" stroke="#d9b800" stroke-width="1"/>` }
function fitIB() { document.querySelectorAll('#chart .ibg').forEach(g => { const w = Math.max(...[...g.querySelectorAll('text')].map(t => t.getComputedTextLength())); g.querySelector('rect').setAttribute('width', Math.ceil(w) + 9) }) }
function renderWeight() {
  const a = weights(), ib = [...S.ib].sort((x, y) => x.date < y.date ? -1 : 1);
  if (!a.length) { $('#stats').innerHTML = ''; $('#chart').innerHTML = '<p class="hint">還沒有體重紀錄。在下方「當天」輸入第一筆,趨勢圖就會出現。</p>'; return }
  const first = a[0], last = a[a.length - 1], tgt = parseFloat(S.g.target), step = parseFloat(S.g.step) || 1;
  const rec = a.filter(x => x.t >= last.t - 14 * DAY), sp = (last.t - rec[0].t) / DAY, rate = sp >= 3 ? (last.tr - rec[0].tr) / sp * 7 : null;
  $('#stats').innerHTML = [[last.v + ' kg', '最新體重 (' + last.d + ')'], [first.v + ' kg', '初始體重 (' + first.d + ')'], [r1(first.v - last.v) + ' kg', '已減體重'], [rate == null ? '—' : sgn(rate) + ' kg', '每週趨勢'], [isNaN(tgt) ? '—' : sgn(tgt - last.v) + ' kg', isNaN(tgt) ? '距離目標' : '距離目標' + tgt + 'KG']].map(i => `<div class="stat"><b>${i[0]}</b><span>${i[1]}</span></div>`).join('');
  const dir = !isNaN(tgt) && tgt > first.v ? 1 : -1, stars = []; let ref = first.v;
  a.slice(1).forEach(x => { if (dir < 0 ? x.v <= ref - step : x.v >= ref + step) { stars.push(x); ref = x.v } });
  const W = 1000, H = 400, L = 38, R = 6, T = 10, B = 68, its = ib.map(i => ts(i.date));
  const t0 = Math.min(first.t, ...its), t1 = Math.max(last.t, ...its), span = Math.max(t1 - t0, DAY), pad = span * .02;
  const X = t => L + (t - t0 + pad) / (span + 2 * pad) * (W - L - R);
  const vs = a.map(x => x.v); if (!isNaN(tgt)) vs.push(tgt);
  const mn = Math.min(...vs), mx = Math.max(...vs), rg = mx - mn + 2, sy = [.5, 1, 2.5, 5, 10, 20].find(s => rg / s <= 8);
  const lo = Math.floor((mn - 1) / sy) * sy, hi = Math.ceil((mx + 1 + (ib.length ? rg * .45 : 0)) / sy) * sy, Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let g = `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none" stroke="var(--ink)"/>`;
  for (let v = lo; v <= hi + 1e-9; v += sy)g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--mut)" stroke-dasharray="1 3" opacity=".6"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--ink)">${v === lo ? '(kg)' : Math.round(v * 100) / 100}</text>`;
  const ev = Math.max(1, Math.ceil(span / DAY / 14));
  for (let t = t0; t <= t1 + 1; t += ev * DAY) { const x = X(t); g += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="var(--mut)" stroke-dasharray="1 3" opacity=".6"/><text transform="translate(${x + 4},${H - B + 14}) rotate(-40)" text-anchor="end" font-size="11" fill="var(--ink)">${ds(t)}</text>` }
  if (!isNaN(tgt) && tgt > lo && tgt < hi) g += `<line x1="${L}" x2="${W - R}" y1="${Y(tgt)}" y2="${Y(tgt)}" stroke="var(--f)" stroke-dasharray="6 4"/><text x="${W - R - 4}" y="${Y(tgt) - 4}" text-anchor="end" font-size="11" fill="var(--f)">目標 ${tgt}</text>`;
  ib.forEach(i => { const x = X(ts(i.date)); g += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="var(--ib)" stroke-dasharray="2 3"/>` });
  const pt = k => a.map(x => X(x.t).toFixed(1) + ',' + Y(x[k]).toFixed(1)).join(' ');
  if ($('#avg').checked && a.length > 1) g += `<polyline points="${pt('tr')}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="5 3"/>`;
  g += `<polyline points="${pt('v')}" fill="none" stroke="var(--ln)" stroke-width="2.5" stroke-linejoin="round"/>`;
  a.length < 60 && (g += a.map(x => `<circle cx="${X(x.t)}" cy="${Y(x.v)}" r="2.5" fill="var(--ln)"><title>${x.d}: ${x.v} kg</title></circle>`).join(''));
  const lv = [-1e9, -1e9, -1e9], lab = (t, v) => { const x = X(t); let k = lv.findIndex(u => x - u >= 28); if (k < 0) k = lv.indexOf(Math.min(...lv)); lv[k] = x; return `<text x="${x}" y="${Y(v) + 22 + k * 12}" text-anchor="middle" font-size="11" fill="var(--ink)" stroke="var(--card)" stroke-width="3" paint-order="stroke">${v}</text>` };
  let lb = lab(first.t, first.v);
  stars.forEach(x => { g += star(X(x.t), Y(x.v), 9); lb += lab(x.t, x.v) });
  g += lb;
  ib.forEach((i, n) => {
    const t = ts(i.date), p = a.reduce((b, x) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, a[0]), x = X(t), y = Y(p.v);
    const ln = [`InBody 檢測 ${cd(n)}`, `骨骼肌: ${i.m}kg`, `體脂率: ${i.fat}%`], tw = q => [...q].reduce((u, c) => u + (c.charCodeAt(0) > 255 ? 11 : 6.2), 0);
    const bw = Math.ceil(Math.max(...ln.map(tw))) + 9, bh = 50;
    let by = y - bh - 14; if (by < T + 4) by = y + 26; const bx = Math.min(x, W - bw + 4);
    g += `<circle cx="${x}" cy="${y}" r="6.5" fill="var(--ib)" stroke="var(--card)" stroke-width="1.5"><title>${i.date}</title></circle><g class="ibg"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="var(--ib)"/><g font-size="11" fill="#fff">${ln.map((q, k) => `<text x="${bx + 5}" y="${by + 14 + k * 14}">${q}</text>`).join('')}</g></g>`
  });
  const lx = W - R - 196, ly = T + 8;
  g += `<rect x="${lx}" y="${ly}" width="188" height="54" rx="5" fill="var(--card)" stroke="var(--line)"/><line x1="${lx + 10}" x2="${lx + 40}" y1="${ly + 16}" y2="${ly + 16}" stroke="var(--ln)" stroke-width="2.5"/><text x="${lx + 50}" y="${ly + 20}" font-size="12" fill="var(--ink)">體重變化趨勢</text>${star(lx + 25, ly + 37, 8)}<text x="${lx + 50}" y="${ly + 42}" font-size="12" fill="var(--ink)">${step}KG 突破里程碑</text>`;
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="體重歷史趨勢折線圖">${g}</svg>`; fitIB();
}
function renderIB() {
  const l = [...S.ib].sort((x, y) => x.date < y.date ? -1 : 1);
  $('#bl').innerHTML = l.length ? l.map((i, n) => `<li class="fi"><div>${cd(n)} ${i.date}<small>骨骼肌 ${i.m} kg · 體脂率 ${i.fat}%</small></div><button class="x" data-ib="${i.id}" aria-label="刪除檢測">×</button></li>`).join('') : '<li class="hint">還沒有檢測紀錄。新增後會以粉紅標記顯示在圖上。</li>';
}
const dayFood = d => S.f.filter(x => x.date === d);
const tot = l => l.reduce((s, x) => ({ k: s.k + x.k, p: s.p + x.p, c: s.c + x.c, f: s.f + x.fa }), { k: 0, p: 0, c: 0, f: 0 });
const MEALS = { b: '早餐', l: '午餐', s: '點心 / 其他', d: '晚餐' }, MK = { '早餐': 'b', '午餐': 'l', '點心': 's', '其他': 's', '點心/其他': 's', '點心 / 其他': 's', '晚餐': 'd' };
const dtOf = d => S.g.types[S.dt[d]] ? S.dt[d] : 'w', fmt = n => r1(n).toLocaleString('en-US'), WK = '日一二三四五六';
function dayInfo(d) { const f = dayFood(d), T = tot(f); return { f, T, ty: S.g.types[dtOf(d)], net: T.k } }
function rbar(label, v, lo, hi, unit, warn) {
  const mx = Math.max(hi * 1.25, v, 1), pc = x => Math.min(100, x / mx * 100);
  return `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>${label}</span><span><span class="${warn ? 'ov' : ''}"><b>${fmt(v)}</b> ${unit}</span> <span style="color:var(--mut)">目標 ${fmt(lo)}–${fmt(hi)}</span></span></div><div class="bar rb"><u style="left:${pc(lo)}%;width:${pc(hi) - pc(lo)}%"></u><i class="${warn ? 'over' : ''}" style="width:${pc(v)}%"></i></div>`
}
function msgs(I) {
  const { T, net, ty } = I, nm = esc(ty.name), o = [[`${nm}TDEE ${fmt(ty.tdee)} kcal，目標${ty.lo}-${ty.hi}kcal。`, 0]];
  if (!I.f.length) return o;
  if (net < ty.lo) o.push([`可補充熱量範圍為${fmt(ty.lo - net)}-${fmt(ty.hi - net)} kcal。`, 0]);
  else if (net <= ty.hi) o.push([`熱量已達目標，最多還可補充 ${fmt(ty.hi - net)} kcal。`, 0]);
  else o.push([`熱量已超過目標上限 ${fmt(net - ty.hi)} kcal。`, 1]);
  o.push([net <= ty.tdee ? `目前熱量赤字為 ${fmt(ty.tdee - net)} kcal。` : `目前熱量盈餘為 ${fmt(net - ty.tdee)} kcal。`, 0]);
  if (T.p < ty.pl) o.push([`${nm}蛋白質需補充 ${fmt(ty.pl - T.p)} g 達目標。`, 0]);
  else if (T.p <= ty.ph) o.push([`${nm}蛋白質已達目標。`, 0]);
  else o.push([`${nm}蛋白質已超過目標上限 ${fmt(T.p - ty.ph)} g。`, 0]);
  return o
}
function diaryText(I) {
  const dt = new Date(ts(day)), ty = I.ty, w = S.w[day], L = [];
  L.push(`${dt.getUTCMonth() + 1}/${dt.getUTCDate()} (${WK[dt.getUTCDay()]}) ${S.g.name || '小愛健康日記'}`);
  if (w != null) L.push(`早晨空腹體重:${w} kg`);
  L.push(`目標熱量:${fmt(ty.lo)} - ${fmt(ty.hi)} kcal (${ty.name})`, `蛋白質:${fmt(ty.pl)} - ${fmt(ty.ph)} g`, '', '今日熱量營養總覽', `總熱量攝取:${fmt(I.T.k)} kcal`, `蛋白質攝取:${fmt(I.T.p)} g`); if (I.T.c || I.T.f) L.push(`碳水攝取:${fmt(I.T.c)} g`, `脂肪攝取:${fmt(I.T.f)} g`); if (n0(S.wa[day])) L.push(`水量:${fmt(S.wa[day])} ml`); L.push('');
  Object.entries(MEALS).forEach(([k, nm], n) => {
    const l = I.f.filter(x => (x.m || 's') === k); if (!l.length) return; const t = tot(l);
    L.push(`${n + 1}. ${nm} (${fmt(t.k)} kcal) ── 蛋白質 ${fmt(t.p)}g`); l.forEach(x => L.push(`  ▪ ${x.name} (${fmt(x.p)}g 蛋白 / ${fmt(x.k)} kcal)`)); L.push('')
  });
  return L.join('\n')
}
function analysis(I) {
  const { T, ty, net, f } = I, g = S.g, o = [], nm = esc(ty.name);
  if (!f.length) return [['加入今天的飲食後,這裡會根據你的數據給出解析與調整建議。', 0]];
  const w = S.w[day], prev = [...weights()].reverse().find(x => x.d < day);
  if (w != null && prev) { const d = r1(w - prev.v); o.push([`體重 ${w} kg,${d === 0 ? '和' : '比'}上一筆 (${prev.d.slice(5)}) ${d === 0 ? '一樣' : (d < 0 ? '少了 ' : '多了 ') + fmt(Math.abs(d)) + ' kg'}。單日起伏多半是水分和鹽分,看每週趨勢比較準。`, 0]) }
  if (net < ty.lo) o.push([`熱量 ${fmt(net)} kcal,還差 ${fmt(ty.lo - net)} kcal 達目標 (${fmt(ty.lo)}–${fmt(ty.hi)} kcal)。`, 0]);
  else if (net <= ty.hi) o.push([`熱量 ${fmt(net)} kcal,已達目標 (${fmt(ty.lo)}–${fmt(ty.hi)} kcal)。`, 0]);
  else o.push([`熱量 ${fmt(net)} kcal,比目標上限多 ${fmt(net - ty.hi)} kcal,後面的餐可以少吃一點。`, 1]);
  o.push([net <= ty.tdee ? `比${nm}的 TDEE (${fmt(ty.tdee)} kcal) 少 ${fmt(ty.tdee - net)} kcal,有熱量赤字。` : `比${nm}的 TDEE (${fmt(ty.tdee)} kcal) 多 ${fmt(net - ty.tdee)} kcal,熱量有多出來。`, 0]);
  if (T.p < ty.pl) o.push([`蛋白質 ${fmt(T.p)} g,還差 ${fmt(ty.pl - T.p)} g 達目標 (${fmt(ty.pl)}–${fmt(ty.ph)} g)。可以補:無糖豆漿 1 杯約 8 g、水煮蛋 1 顆約 6 g、乳清 1 份約 20–25 g。`, 0]);
  else if (T.p <= ty.ph) o.push([`蛋白質 ${fmt(T.p)} g,已達目標 (${fmt(ty.pl)}–${fmt(ty.ph)} g)。`, 0]);
  else o.push([`蛋白質 ${fmt(T.p)} g,比目標上限多 ${fmt(T.p - ty.ph)} g。`, 0]);
  const need = [], ok = [], over = [], chk = (n, v, t, u) => { t = n0(t); if (t <= 0) return; v > t ? over.push(`${n}超過目標 ${fmt(v - t)} ${u}`) : v === t ? ok.push(n) : need.push(`${n}還差 ${fmt(t - v)} ${u}`) };
  if (T.c > 0) chk('碳水', T.c, g.carb, 'g');
  if (T.f > 0) chk('脂肪', T.f, g.fat, 'g');
  chk('水量', n0(S.wa[day]), g.water, 'ml');
  const parts = [need.length ? need.join('、') + ' 達目標' : '', ok.length ? ok.join('、') + '已達目標' : '', over.join('、')].filter(Boolean);
  if (parts.length) o.push([parts.join(';') + '。', over.length ? 1 : 0]);
  const sn = tot(f.filter(x => (x.m || 's') === 's')).k;
  if (T.k > 0 && sn / T.k > .3) o.push([`點心 / 其他占了 ${Math.round(sn / T.k * 100)}% 的熱量,想少吃一點的話可以先從這裡減。`, 0]);
  return o
}
function renderFood() {
  const I = dayInfo(day), { T, ty, net } = I, g = S.g;
  const wv = S.w[day] != null ? S.w[day] : (weights().filter(x => x.d < day).pop() || {}).v, mr = (a, b) => wv ? `<span class="mn">${r1(wv * a)}-${r1(wv * b)}</span>` : '';
  $('#th').textContent = day + (day === tdy() ? ' (今日)' : ''); $('#h1').textContent = document.title = S.g.name || '小愛健康日記';
  $('#dt').innerHTML = Object.entries(g.types).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join(''); $('#dt').value = dtOf(day);
  const a = weights(), prev = [...a].reverse().find(x => x.d < day);
  $('#wh').textContent = S.w[day] != null && prev ? `比上一筆 (${prev.d.slice(5)}) ${sgn(S.w[day] - prev.v)} kg` : '';
  $('#list').innerHTML = I.f.length ? Object.entries(MEALS).map(([k, nm]) => {
    const l = I.f.filter(x => (x.m || 's') === k); if (!l.length) return ''; const t = tot(l);
    return `<li class="mh">${nm} (${fmt(t.k)} kcal)</li>` + l.map(x => `<li class="fi"><div>${esc(x.name)}<small>${fmt(x.k)} kcal · 蛋白 ${fmt(x.p)}g${x.c || x.fa ? ` · 碳水 ${fmt(x.c)}g · 脂肪 ${fmt(x.fa)}g` : ''}</small></div><button class="x" data-id="${x.id}" aria-label="刪除 ${esc(x.name)}">×</button></li>`).join('')
  }).join('') : '<li class="hint">這天還沒有飲食紀錄,從上方加入第一筆。</li>';
  const m = [T.p * 4, T.c * 4, T.f * 9], ms = m[0] + m[1] + m[2] || 1, col = ['var(--p)', '#ffb600', 'var(--f)'], has = I.f.length > 0;
  $('#today').innerHTML = `<div class="stats s5">${[[T.k, `熱量目標${ty.lo}-${ty.hi}kcal`, 'kcal'], [T.p, `目標蛋白質${ty.pl}-${ty.ph}g`, 'g'], [T.c, n0(g.carb) > 0 ? `目標碳水${g.carb}g` : '碳水攝取', 'g'], [T.f, n0(g.fat) > 0 ? `目標脂肪${g.fat}g` : '脂肪攝取', 'g'], [n0(S.wa[day]), n0(g.water) > 0 ? '目標水量 ' + fmt(g.water) : '水量', 'ml']].map(i => `<div class="stat"><b>${fmt(i[0])} ${i[2]}</b><span>${i[1]}</span></div>`).join('')}</div>`;
  $('#bars').innerHTML =
    (T.c + T.f > 0 ? `<div class="split">${m.map((v, i) => `<i style="width:${v / ms * 100}%;background:${col[i]}"></i>`).join('')}</div><div class="leg"><span><i class="dot" style="background:var(--p)"></i>蛋白質 <b>${fmt(T.p)} g</b> (${Math.round(m[0] / ms * 100)}%)</span><span><i class="dot" style="background:#ffb600"></i>碳水 <b>${fmt(T.c)} g</b> (${Math.round(m[1] / ms * 100)}%)</span><span><i class="dot" style="background:var(--f)"></i>脂肪 <b>${fmt(T.f)} g</b> (${Math.round(m[2] / ms * 100)}%)</span></div>` : '') +
    rbar('熱量', net, ty.lo, ty.hi, 'kcal', has && net > ty.hi) + rbar('蛋白質' + mr(1.2, 1.5) + '<small class="mx">(x1.2-1.5)</small>', T.p, ty.pl, ty.ph, 'g', false) + (n0(g.carb) > 0 ? tbar('碳水' + mr(2, 3) + '<small class="mx">(x2-3)</small>', T.c, n0(g.carb), 'g', 1) : '') + (n0(g.fat) > 0 ? tbar('脂肪' + mr(0.8, 1.2) + '<small class="mx">(x0.8-1.2)</small>', T.f, n0(g.fat), 'g', 1) : '') + (n0(g.water) > 0 || n0(S.wa[day]) > 0 ? tbar('水量', n0(S.wa[day]), n0(g.water), 'ml', 0) : '') +
    '';
  $('#tips').innerHTML = `<div class="tt">⭐重點提示</div><ul>${msgs(I).map(([t, w]) => `<li class="${w ? 'warn' : ''}">${t}</li>`).join('')}</ul>`;
  $('#ana').innerHTML = analysis(I).map(([t, w]) => `<li class="${w ? 'warn' : ''}">${t.replace(/。(?!$)/g, '。<br>')}</li>`).join('');
  const days = []; for (let i = 0; i < 7; i++)days.push(ds(ts(day) - i * DAY));
  const ks = days.map(d => dayInfo(d).net), mx = Math.max(...Object.values(g.types).map(t => n0(t.hi)), ...ks, 1);
  $('#week').innerHTML = days.map((d, i) => `<button data-d="${d}" class="${d === day ? 'sel' : ''}" title="${d}"><span>${Math.round(ks[i]) || ''}</span><i style="height:${Math.max(2, Math.max(ks[i], 0) / mx * 80)}px"></i><span>${d.slice(8)}</span></button>`).join('');
  $('#names').innerHTML = [...new Set(S.f.map(x => x.name))].slice(-40).map(n => `<option value="${esc(n)}">`).join('');
  $('#dtx').value = diaryText(I); renderCal();
}
function renderCal() {
  const [y, m] = cal.split('-').map(Number), dim = new Date(Date.UTC(y, m, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const a = weights(), ix = {}; a.forEach((x, i) => ix[x.d] = i);
  let h = `<div class="calh"><button type="button" data-m="-1" aria-label="上個月">‹</button><span>${y}年${m}月</span><button type="button" data-m="1" aria-label="下個月">›</button></div><div class="calw">${[...'一二三四五六日'].map(x => `<span>${x}</span>`).join('')}</div><div class="calg">`;
  for (let i = 0; i < lead; i++)h += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const k = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, i = ix[k]; let b = '';
    if (i != null) { const x = a[i], p = a[i - 1]; if (p) { const dl = r1(x.v - p.v); b += `<span class="bd ${dl < 0 ? 'dn' : dl > 0 ? 'up' : 'ze'}">${dl < 0 ? '▼ ' : dl > 0 ? '▲ ' : '– '}${Math.abs(dl)}</span>` } b += `<span class="bd w">${x.v}</span>` }
    h += `<div class="cld${k === day ? ' sel' : ''}${k === tdy() ? ' td' : ''}" data-d="${k}"><b>${d}</b>${b}</div>`
  }
  for (let i = (lead + dim) % 7; i > 0 && i < 7; i++)h += '<div></div>'; $('#cal').innerHTML = h + '</div>'
}
$('#cal').addEventListener('click', e => {
  const n = e.target.closest('[data-m]');
  if (n) { const [y, m] = cal.split('-').map(Number); cal = new Date(Date.UTC(y, m - 1 + Number(n.dataset.m), 1)).toISOString().slice(0, 7); renderCal(); return }
  const c = e.target.closest('[data-d]'); if (c) setDay(c.dataset.d)
});
function tbar(label, v, goal, unit, warn) { const pct = goal > 0 ? Math.min(100, v / goal * 100) : 0; return `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>${label}</span><span><span class="${warn && goal > 0 && v > goal ? 'ov' : ''}"><b>${fmt(v)}</b> ${unit}</span>${goal > 0 ? ` <span style="color:var(--mut)">目標 ${fmt(goal)}</span>` : ''}</span></div><div class="bar"><i class="${warn && goal > 0 && v > goal ? 'over' : ''}" style="width:${pct}%"></i></div>` }
const addW = n => { S.wa[day] = Math.max(0, n0(S.wa[day]) + n); persist() };
$('#wbtns').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) addW(+b.dataset.w) });
$('#wadd').addEventListener('click', () => { const v = n0($('#wi').value); if (v) { addW(v); $('#wi').value = '' } });
$('#wzero').addEventListener('click', () => { delete S.wa[day]; persist() });
const ni = (k, f, w, st, ph) => `<input data-k="${k}" data-f="${f}" type="number" inputmode="decimal" min="0" step="${st}" value="${esc(S.g.types[k][f] ?? '')}" aria-label="${esc(S.g.types[k].name)} ${ph}" placeholder="${ph}" style="width:${w}px">`;
function renderTypes() {
  $('#gtypes').innerHTML = `<div class="tw"><table class="gt"><thead><tr><th>日類型</th><th>TDEE (kcal)</th><th>熱量範圍 (kcal)</th><th>蛋白質範圍 (g)</th></tr></thead><tbody>${Object.entries(S.g.types).map(([k, t], r) => `<tr class="r${r}"><td><input data-k="${k}" data-f="name" type="text" value="${esc(t.name)}" aria-label="日類型名稱"></td><td>${ni(k, 'tdee', 84, 10, 'TDEE')}</td><td><div class="rg">${ni(k, 'lo', 84, 10, '下限')}<span>–</span>${ni(k, 'hi', 84, 10, '上限')}</div></td><td><div class="rg">${ni(k, 'pl', 72, 1, '下限')}<span>–</span>${ni(k, 'ph', 72, 1, '上限')}</div></td></tr>`).join('')}</tbody></table></div><p class="hint" id="gth">範圍填「下限 – 上限」,點進欄位會自動選取數字;填反了會自動對調。</p>`
}
$('#gtypes').addEventListener('input', e => { const i = e.target; if (!i.dataset.k) return; S.g.types[i.dataset.k][i.dataset.f] = i.type === 'number' ? n0(i.value) : i.value; save(); renderFood() });
$('#gtypes').addEventListener('focusin', e => { if (e.target.type === 'number') e.target.select() });
$('#gtypes').addEventListener('change', e => {
  const k = e.target.dataset.k; if (!k) return; const t = S.g.types[k]; let fixed = false;
  [['lo', 'hi'], ['pl', 'ph']].forEach(([a, b]) => { if (n0(t[a]) > 0 && n0(t[b]) > 0 && n0(t[a]) > n0(t[b])) { [t[a], t[b]] = [t[b], t[a]]; fixed = true } });
  if (fixed) { save(); renderTypes(); renderFood(); $('#gth').textContent = '下限比上限高,已自動對調。' }
});
$('#dt').addEventListener('change', e => { S.dt[day] = e.target.value; persist() });
$('#dcp').addEventListener('click', () => {
  const t = $('#dtx'), m = $('#dres'); t.select();
  (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => m.textContent = '已複製', () => { try { m.textContent = document.execCommand('copy') ? '已複製' : '請手動複製選取的文字' } catch (e) { m.textContent = '請手動複製選取的文字' } })
});
function setDay(d) { day = d || tdy(); cal = day.slice(0, 7); $('#day').value = day; $('#bd').value = day; $('#wv').value = S.w[day] ?? ''; renderFood() }
function renderAll() { renderWeight(); renderIB(); renderFood(); $('#bk').value = JSON.stringify(S) }
function persist() { save(); renderAll(); }

$('#avg').addEventListener('change', renderWeight);
$('#day').addEventListener('change', e => setDay(e.target.value));
$('#wf').addEventListener('submit', e => { e.preventDefault(); const v = parseFloat($('#wv').value); if (!isNaN(v)) { S.w[day] = v; persist() } });
$('#wdel').addEventListener('click', () => { delete S.w[day]; $('#wv').value = ''; persist() });
$('#bf').addEventListener('submit', e => { e.preventDefault(); S.ib.push({ id: Date.now() + '', date: $('#bd').value, m: r1(n0($('#bm').value)), fat: r1(n0($('#bfat').value)) }); $('#bm').value = ''; $('#bfat').value = ''; persist() });
$('#bl').addEventListener('click', e => { const b = e.target.closest('[data-ib]'); if (b) { S.ib = S.ib.filter(x => x.id !== b.dataset.ib); persist() } });
const macroKcal = () => n0($('#fp').value) * 4 + n0($('#fc').value) * 4 + n0($('#ff2').value) * 9;
['fp', 'fc', 'ff2', 'fk'].forEach(id => $('#' + id).addEventListener('input', () => {
  const m = macroKcal(); $('#est').textContent = m > 0 ? `依三大營養素計算約 ${Math.round(m)} kcal${$('#fk').value ? '(已手動輸入熱量)' : ',將自動填入'}` : ''
}));
$('#fn').addEventListener('change', () => { const x = [...S.f].reverse().find(y => y.name === $('#fn').value); if (x) { $('#fk').value = x.k; $('#fp').value = x.p; $('#fc').value = x.c; $('#ff2').value = x.fa } });
$('#ff').addEventListener('submit', e => {
  e.preventDefault();
  const p = n0($('#fp').value), c = n0($('#fc').value), fa = n0($('#ff2').value);
  const k = $('#fk').value === '' ? p * 4 + c * 4 + fa * 9 : n0($('#fk').value);
  S.f.push({ id: Date.now() + Math.random().toString(36).slice(2, 5), date: day, m: $('#fm').value, name: $('#fn').value.trim(), k, p, c, fa });
  const mv = $('#fm').value; e.target.reset(); $('#fm').value = mv; $('#est').textContent = '已加入。'; persist(); $('#fn').focus()
});
$('#list').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) { S.f = S.f.filter(x => x.id !== b.dataset.id); persist() } });
$('#week').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) setDay(b.dataset.d) });
const gmap = { gn: 'name', gt: 'target', gs: 'step', gw: 'water', gc: 'carb', gf: 'fat' };
const fillG = () => { Object.entries(gmap).forEach(([id, key]) => $('#' + id).value = S.g[key] ?? ''); renderTypes() };
fillG();
Object.entries(gmap).forEach(([id, key]) => $('#' + id).addEventListener('input', e => { S.g[key] = e.target.value; save(); renderWeight(); renderFood() }));
$('#bkr').addEventListener('click', () => { if (!readyToSave) return; try { const o = JSON.parse($('#bk').value); validateState(o); if (!confirm('還原會取代線上 data.json 的全部紀錄，確定繼續？')) return; hydrateState(o); fillG(); persist(); setDay(day) } catch (e) { alert('備份格式不正確,請貼上完整的備份文字。') } });
$('#jsonExport').addEventListener('click', exportJsonFile);
$('#jsonFile').addEventListener('change', e => importJsonFile(e.target.files && e.target.files[0]));
const nd = s => { const m = String(s).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); return m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : null };
const PH = { w: '2025-08-08 79.8\n2025-08-09 78.9', i: '2025-08-08 29.5 34.0\n2025-11-05 29.1 29.2', f: '2026-10-06,早餐,全家大杯冰拿鐵,189,6.9\n2026-10-06,午餐,泰式打拋雞餐盒,610,32' };
$('#bty').addEventListener('change', e => { $('#btx').placeholder = PH[e.target.value] });
$('#bimp').addEventListener('click', () => {
  const ty = $('#bty').value, ok = [], bad = [];
  $('#btx').value.split(/\r?\n/).forEach((ln, i) => {
    ln = ln.trim(); if (!ln) return;
    const p = ty === 'f' ? ln.split(/[\t,，;]/).map(s => s.trim()) : ln.split(/[\t,，;\s]+/), d = nd(p[0]), v = p.slice(1).map(parseFloat);
    if (!d) { bad.push(i + 1); return }
    if (ty === 'w' && !isNaN(v[0])) { S.w[d] = v[0]; ok.push(i) }
    else if (ty === 'i' && v.length >= 2 && !isNaN(v[0]) && !isNaN(v[1])) { S.ib = S.ib.filter(x => x.date !== d); S.ib.push({ id: Date.now() + '-' + i, date: d, m: v[0], fat: v[1] }); ok.push(i) }
    else if (ty === 'f' && p.length >= 3) { const mk = MK[p[1]], q = mk ? p.slice(2) : p.slice(1); if (!q[0] || q.length < 2) { bad.push(i + 1); return } const pp = n0(q[2]), c = n0(q[3]), f = n0(q[4]); S.f.push({ id: Date.now() + '-' + i, date: d, m: mk || 's', name: q[0], k: q[1] === '' ? pp * 4 + c * 4 + f * 9 : n0(q[1]), p: pp, c, fa: f }); ok.push(i) }
    else bad.push(i + 1)
  });
  if (ok.length) { persist(); setDay(day); $('#btx').value = '' }
  $('#bres').textContent = '已匯入 ' + ok.length + ' 筆' + (bad.length ? ',第 ' + bad.join('、') + ' 行格式不符,已略過' : '');
});
(() => {
  editLock(true);
  storageStatus('請輸入 GitHub 權杖並連線，讀取共用的 data.json。');
  fillG();
  setDay(day); renderAll();
  editLock(true);
  if (document.fonts) document.fonts.ready.then(fitIB);
})();

$('#cloudConnect').addEventListener('click', loadJsonState);
$('#cloudRetry').addEventListener('click', () => { if (readyToSave) save(); });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
