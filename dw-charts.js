// DriveWise charts: small SVG bar charts with hover tooltips and a table view.
// No library needed. Used by admin-analytics.html and provider.html.
//
//   DWCharts.bars(element, {
//     label: "Revenue per month",            // accessible name
//     categories: ["Jun 2026", "Jul 2026"],
//     series: [{ name: "Revenue", color: "#5B3FD9", values: [1822, 4270] }],
//     format: (n) => "₹" + n                 // value formatting
//   });
//
// Rules followed: one y-axis, bars anchored at zero with 4px rounded tops, 2px gap
// between bars in a group, recessive grid, a legend when there are 2+ series, a
// tooltip on hover/focus for every month, and a "Show as table" view.
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function niceMax(max) {
    if (max <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const n = max / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  function shortMoney(n) {
    const a = Math.abs(n);
    if (a >= 100000) return "₹" + (n / 100000).toFixed(a >= 1000000 ? 0 : 1).replace(/\.0$/, "") + "L";
    if (a >= 1000) return "₹" + (n / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
    return "₹" + Math.round(n);
  }

  // Bar with a rounded top (4px) and a square base on the zero line
  function barPath(x, y, w, h) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  function bars(root, opts) {
    const format = opts.format || ((n) => String(n));
    const series = opts.series || [];
    const cats = opts.categories || [];
    root.classList.add("dwc");
    root.innerHTML = "";

    if (series.length > 1) {
      const legend = document.createElement("ul");
      legend.className = "dwc-legend";
      legend.innerHTML = series.map((s) => `<li><i style="background:${s.color}"></i>${esc(s.name)}</li>`).join("");
      root.append(legend);
    }

    const plot = document.createElement("div");
    plot.className = "dwc-plot";
    root.append(plot);
    const tip = document.createElement("div");
    tip.className = "dwc-tip";
    tip.hidden = true;
    plot.append(tip);

    const table = document.createElement("details");
    table.className = "dwc-table";
    table.innerHTML = `<summary>Show as table</summary><div class="table-wrapper"><table>
      <thead><tr><th scope="col">${esc(opts.categoryLabel || "")}</th>${series.map((s) => `<th scope="col">${esc(s.name)}</th>`).join("")}</tr></thead>
      <tbody>${cats.map((c, i) => `<tr><th scope="row">${esc(c)}</th>${series.map((s) => `<td>${esc(format(s.values[i] || 0))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
    root.append(table);

    if (!cats.length) {
      plot.insertAdjacentHTML("afterbegin", `<p class="dwc-empty">No data yet.</p>`);
      return;
    }

    function draw() {
      plot.querySelectorAll("svg").forEach((s) => s.remove());
      const W = Math.max(300, plot.clientWidth || 600);
      const H = opts.height || 260;
      const m = { top: 12, right: 8, bottom: 30, left: 52 };
      const iw = W - m.left - m.right, ih = H - m.top - m.bottom;
      const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values.map(Number))));
      const y = (v) => m.top + ih - (Math.max(0, v) / max) * ih;
      const band = iw / cats.length;
      const groupW = Math.min(band * 0.7, 28 * series.length + 2 * (series.length - 1));
      const barW = (groupW - 2 * (series.length - 1)) / series.length;

      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", opts.label || "Bar chart");

      let html = "";
      for (let i = 0; i <= 4; i++) {
        const v = (max / 4) * i, yy = y(v);
        html += `<line x1="${m.left}" x2="${W - m.right}" y1="${yy}" y2="${yy}" class="dwc-grid${i === 0 ? " dwc-zero" : ""}"/>`;
        html += `<text x="${m.left - 8}" y="${yy + 4}" text-anchor="end" class="dwc-axis">${esc((opts.axisFormat || shortMoney)(v))}</text>`;
      }
      cats.forEach((c, i) => {
        const gx = m.left + band * i + (band - groupW) / 2;
        series.forEach((s, j) => {
          const v = Number(s.values[i]) || 0;
          const top = y(v), h = m.top + ih - top;
          if (h > 0) html += `<path d="${barPath(gx + j * (barW + 2), top, barW, h)}" fill="${s.color}"/>`;
        });
        html += `<text x="${m.left + band * i + band / 2}" y="${H - 10}" text-anchor="middle" class="dwc-axis">${esc(c)}</text>`;
        // Hover / focus target: the whole column, bigger than the bars
        html += `<rect class="dwc-hit" x="${m.left + band * i}" y="${m.top}" width="${band}" height="${ih}" data-i="${i}" tabindex="0" aria-label="${esc(c)}: ${esc(series.map((s) => `${s.name} ${format(s.values[i] || 0)}`).join(", "))}"/>`;
      });
      svg.innerHTML = html;
      plot.prepend(svg);

      const show = (rect) => {
        const i = Number(rect.dataset.i);
        svg.querySelectorAll(".dwc-hit").forEach((r) => r.classList.toggle("is-on", r === rect));
        tip.innerHTML = `<strong>${esc(cats[i])}</strong>` + series.map((s) =>
          `<span>${series.length > 1 ? `<i style="background:${s.color}"></i>${esc(s.name)} ` : ""}<b>${esc(format(s.values[i] || 0))}</b></span>`).join("");
        tip.hidden = false;
        const x = m.left + band * i + band / 2;
        const left = Math.min(Math.max(x - tip.offsetWidth / 2, 0), W - tip.offsetWidth);
        tip.style.left = `${left}px`;
        tip.style.top = `${Math.max(0, y(Math.max(...series.map((s) => Number(s.values[i]) || 0))) - tip.offsetHeight - 8)}px`;
      };
      const hide = () => { tip.hidden = true; svg.querySelectorAll(".dwc-hit").forEach((r) => r.classList.remove("is-on")); };
      svg.querySelectorAll(".dwc-hit").forEach((r) => {
        r.addEventListener("mouseenter", () => show(r));
        r.addEventListener("focus", () => show(r));
        r.addEventListener("blur", hide);
      });
      svg.addEventListener("mouseleave", hide);
    }

    draw();
    if (window.ResizeObserver) {
      let last = plot.clientWidth;
      new ResizeObserver(() => { if (Math.abs(plot.clientWidth - last) > 4) { last = plot.clientWidth; draw(); } }).observe(plot);
    }
  }

  // "2026-06" -> "Jun 2026"
  function monthLabel(ym) {
    const [y, m] = String(ym).split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }

  window.DWCharts = { bars, monthLabel, shortMoney };
})();
