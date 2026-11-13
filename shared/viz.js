/* Minimal SVG chart kit shared by the portfolio dashboards.
   Line (crosshair + tooltip), scatter, horizontal bar. No dependencies. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const nice = (min, max, n = 5) => {
    const span = max - min || 1;
    const step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo, hi, ticks };
  };
  const fmt = (v) => {
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (a >= 1e4) return (v / 1e3).toFixed(0) + "K";
    if (Number.isInteger(v)) return v.toLocaleString("es-ES");
    return v.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  };

  let tip;
  const tooltip = () => {
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; document.body.appendChild(tip); }
    return tip;
  };
  const showTip = (html, ev) => {
    const t = tooltip(); t.innerHTML = html; t.style.opacity = 1;
    const r = t.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    t.style.left = x + "px"; t.style.top = y + "px";
  };
  const hideTip = () => { if (tip) tip.style.opacity = 0; };

  function frame(host, o) {
    host.innerHTML = "";
    const W = host.clientWidth || 600, H = o.height || 300;
    const m = { t: 12, r: o.right || 16, b: o.xLabel ? 44 : 28, l: 52 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: H, role: "img",
                             "aria-label": o.aria || "" }, host);
    return { svg, W, H, m, iw: W - m.l - m.r, ih: H - m.t - m.b };
  }
  function axes(f, xs, ys, o) {
    const g = el("g", {}, f.svg);
    ys.ticks.forEach((v) => {
      const y = f.m.t + f.ih - ((v - ys.lo) / (ys.hi - ys.lo)) * f.ih;
      el("line", { x1: f.m.l, x2: f.m.l + f.iw, y1: y, y2: y, stroke: css("--grid"), "stroke-width": 1 }, g);
      const t = el("text", { x: f.m.l - 8, y: y + 4, "text-anchor": "end", class: "viz-tick" }, g);
      t.textContent = (o.yFmt || fmt)(v);
    });
    xs.ticks.forEach((v) => {
      const x = f.m.l + ((v - xs.lo) / (xs.hi - xs.lo)) * f.iw;
      const t = el("text", { x, y: f.m.t + f.ih + 18, "text-anchor": "middle", class: "viz-tick" }, g);
      t.textContent = (o.xFmt || fmt)(v);
    });
    el("line", { x1: f.m.l, x2: f.m.l + f.iw, y1: f.m.t + f.ih, y2: f.m.t + f.ih, stroke: css("--axis") }, g);
    if (o.xLabel) {
      const t = el("text", { x: f.m.l + f.iw / 2, y: f.H - 6, "text-anchor": "middle", class: "viz-label" }, g);
      t.textContent = o.xLabel;
    }
    if (o.yLabel) {
      const t = el("text", { x: 12, y: f.m.t + f.ih / 2, "text-anchor": "middle", class: "viz-label",
                              transform: `rotate(-90 12 ${f.m.t + f.ih / 2})` }, g);
      t.textContent = o.yLabel;
    }
  }

  /* series: [{name, values, color, dash, fill}] ; x: array of numbers */
  function line(host, o) {
    const f = frame(host, o);
    const all = o.series.flatMap((s) => s.values.filter((v) => v != null));
    const xs = nice(Math.min(...o.x), Math.max(...o.x), o.xTicks || 6);
    xs.lo = Math.min(...o.x); xs.hi = Math.max(...o.x);
    xs.ticks = xs.ticks.filter((v) => v >= xs.lo && v <= xs.hi);
    const ys = nice(o.yMin ?? Math.min(0, ...all), o.yMax ?? Math.max(...all), 5);
    axes(f, xs, ys, o);
    const X = (v) => f.m.l + ((v - xs.lo) / (xs.hi - xs.lo)) * f.iw;
    const Y = (v) => f.m.t + f.ih - ((v - ys.lo) / (ys.hi - ys.lo)) * f.ih;
    if (o.band) { // horizontal band e.g. alert zone
      el("rect", { x: f.m.l, width: f.iw, y: Y(o.band.to), height: Y(o.band.from) - Y(o.band.to),
                   fill: o.band.color, opacity: 0.12 }, f.svg);
      const t = el("text", { x: f.m.l + f.iw - 6, y: Y(o.band.to) + 14, "text-anchor": "end", class: "viz-tick" }, f.svg);
      t.textContent = o.band.label;
    }
    o.series.forEach((s) => {
      let d = "", pen = false;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + X(o.x[i]).toFixed(1) + "," + Y(v).toFixed(1); pen = true;
      });
      if (s.fill) {
        const first = s.values.findIndex((v) => v != null);
        const last = s.values.length - 1 - [...s.values].reverse().findIndex((v) => v != null);
        el("path", { d: d + `L${X(o.x[last])},${Y(ys.lo)}L${X(o.x[first])},${Y(ys.lo)}Z`,
                     fill: s.color, opacity: 0.1 }, f.svg);
      }
      el("path", { d, fill: "none", stroke: s.color, "stroke-width": s.width || 2,
                   "stroke-linejoin": "round", "stroke-linecap": "round",
                   "stroke-dasharray": s.dash || "" }, f.svg);
    });
    // crosshair
    const hair = el("line", { y1: f.m.t, y2: f.m.t + f.ih, stroke: css("--axis"), opacity: 0 }, f.svg);
    const dots = o.series.map((s) => el("circle", { r: 4, fill: s.color, stroke: css("--surface"),
                                                     "stroke-width": 2, opacity: 0 }, f.svg));
    const hit = el("rect", { x: f.m.l, y: f.m.t, width: f.iw, height: f.ih, fill: "transparent" }, f.svg);
    hit.addEventListener("mousemove", (ev) => {
      const r = f.svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * f.W;
      const xv = xs.lo + ((px - f.m.l) / f.iw) * (xs.hi - xs.lo);
      let i = 0, best = Infinity;
      o.x.forEach((v, k) => { const d = Math.abs(v - xv); if (d < best) { best = d; i = k; } });
      hair.setAttribute("x1", X(o.x[i])); hair.setAttribute("x2", X(o.x[i])); hair.setAttribute("opacity", 1);
      let html = `<b>${(o.xTip || ((v) => (o.xLabel || "x") + " " + fmt(v)))(o.x[i])}</b>`;
      o.series.forEach((s, k) => {
        const v = s.values[i];
        if (v == null) { dots[k].setAttribute("opacity", 0); return; }
        dots[k].setAttribute("cx", X(o.x[i])); dots[k].setAttribute("cy", Y(v)); dots[k].setAttribute("opacity", 1);
        html += `<div><i style="background:${s.color}"></i>${s.name}: <b>${(o.yTip || fmt)(v)}</b></div>`;
      });
      showTip(html, ev);
    });
    hit.addEventListener("mouseleave", () => { hair.setAttribute("opacity", 0); dots.forEach((d) => d.setAttribute("opacity", 0)); hideTip(); });
  }

  /* points: [{x, y, label}] */
  function scatter(host, o) {
    const f = frame(host, o);
    const vx = o.points.map((p) => p.x), vy = o.points.map((p) => p.y);
    const lo = Math.min(0, ...vx, ...vy), hi = Math.max(...vx, ...vy);
    const xs = nice(lo, hi, 5), ys = nice(lo, hi, 5);
    axes(f, xs, ys, o);
    const X = (v) => f.m.l + ((v - xs.lo) / (xs.hi - xs.lo)) * f.iw;
    const Y = (v) => f.m.t + f.ih - ((v - ys.lo) / (ys.hi - ys.lo)) * f.ih;
    if (o.diag) el("line", { x1: X(xs.lo), y1: Y(ys.lo), x2: X(Math.min(xs.hi, ys.hi)), y2: Y(Math.min(xs.hi, ys.hi)),
                             stroke: css("--text-3"), "stroke-width": 1 }, f.svg);
    o.points.forEach((p) => {
      const c = el("circle", { cx: X(p.x), cy: Y(p.y), r: 4.5, fill: p.color || o.color,
                               stroke: css("--surface"), "stroke-width": 2 }, f.svg);
      const h = el("circle", { cx: X(p.x), cy: Y(p.y), r: 10, fill: "transparent" }, f.svg);
      h.addEventListener("mousemove", (ev) => { c.setAttribute("r", 6); showTip(p.tip || `${fmt(p.x)} → ${fmt(p.y)}`, ev); });
      h.addEventListener("mouseleave", () => { c.setAttribute("r", 4.5); hideTip(); });
    });
  }

  /* items: [{label, value}] horizontal bars, value labels at tip */
  function bars(host, o) {
    host.innerHTML = "";
    const max = Math.max(...o.items.map((d) => d.value));
    o.items.forEach((d) => {
      const row = document.createElement("div"); row.className = "viz-bar";
      row.innerHTML = `<span class="viz-bar-l">${d.label}</span>
        <span class="viz-bar-t"><span class="viz-bar-f" style="width:${(100 * d.value) / max}%;background:${d.color || o.color}"></span></span>
        <span class="viz-bar-v">${(o.fmt || fmt)(d.value)}</span>`;
      row.addEventListener("mousemove", (ev) => showTip(`<b>${d.label}</b><div>${(o.fmt || fmt)(d.value)}</div>`, ev));
      row.addEventListener("mouseleave", hideTip);
      host.appendChild(row);
    });
  }

  /* Animate numbers counting up (data-count attr) */
  function countUp(root = document) {
    root.querySelectorAll("[data-count]").forEach((e) => {
      const target = parseFloat(e.dataset.count), dec = +(e.dataset.dec || 0);
      const pre = e.dataset.pre || "", suf = e.dataset.suf || "";
      const t0 = performance.now(), dur = 1200;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - k, 3));
        e.textContent = pre + v.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  window.Viz = { line, scatter, bars, countUp, fmt };
})();
