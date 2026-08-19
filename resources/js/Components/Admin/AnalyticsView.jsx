import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import I from '../Icons';
import { csvCell } from './AdminShared';

const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

const DONUT_COLORS = ['var(--brand)', 'var(--accent)', '#7ba7c9', '#a8c4a2', '#d69f7e', 'var(--muted)', 'var(--accent-soft)'];

function AnalyticsEmpty({ label }) {
  return (
    <div className="adm-empty" style={{ padding: '32px 20px' }}>
      <I.chart width="34" height="34" />
      <h3 style={{ fontSize: 16 }}>No conversions yet in this range</h3>
      <p style={{ marginBottom: 0 }}>{label || 'Try a wider date range once conversions start syncing in.'}</p>
    </div>
  );
}

function downloadAnalyticsReport(analytics, range) {
  const kpis = analytics.kpis || {};
  const trend = analytics.salesTrend || { series: [] };
  const lines = [];
  const push = (row) => lines.push(row.map(csvCell).join(','));

  push([`Limitra Analytics Report — last ${range} days`]);
  push([]);

  push(['KPI', 'Value']);
  push(['Total clicks', kpis.clicks ?? 0]);
  push(['Orders', kpis.orders ?? 0]);
  push(['Conversion rate (%)', kpis.conversion_rate ?? 0]);
  push(['Sales volume ($)', kpis.sales_volume ?? 0]);
  push(['Avg. order value ($)', kpis.aov ?? 0]);
  push(['Settled rate (%)', kpis.settled_rate ?? 0]);
  push(['Reversal rate (%)', kpis.reversal_rate ?? 0]);
  push(['Commission earned ($)', kpis.commission_earned ?? 0]);
  push(['EPC ($)', kpis.epc ?? 0]);
  push([]);

  push(['Daily sales trend']);
  push(['Date', 'Sales ($)', '7-day moving average ($)']);
  (trend.series || []).forEach((d, i) => push([d.date, d.sales, (trend.moving_average || [])[i] ?? '']));
  push([]);

  push(['Sales by category']);
  push(['Category', 'Sales ($)']);
  (analytics.salesByCategory?.items || []).forEach((c) => push([c.category, c.sales]));
  push([]);

  push(['Retailer sales ratio']);
  push(['Retailer', 'Sales ($)', 'Share (%)']);
  (analytics.retailerRatio?.items || []).forEach((r) => push([r.retailer, r.sales, r.pct]));
  push([]);

  push(['Clicks by device']);
  push(['Device', 'Clicks', 'Share (%)']);
  (analytics.clicksByDevice?.items || []).forEach((d) => push([d.device, d.clicks, d.pct]));
  push([]);

  push(['Top source pages']);
  push(['Page', 'Clicks']);
  (analytics.topSourcePages?.items || []).forEach((p) => push([p.page, p.clicks]));
  push([]);

  push(['Top products']);
  push(['Product', 'Brand', 'Category', 'Retailer', 'Units', 'Sales ($)', 'Commission ($)']);
  (analytics.topProducts?.items || []).forEach((p) => push([p.name, p.brand, p.category, p.retailer, p.units, p.sales, p.commission]));
  push([]);

  push(['Top articles']);
  push(['Title', 'Views']);
  (analytics.topArticles?.items || []).forEach((a) => push([a.title, a.views]));
  push([]);

  push(['Top videos']);
  push(['Title', 'Views']);
  (analytics.topVideos?.items || []).forEach((v) => push([v.title, v.views]));

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-report-${range}d.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsView({ analytics }) {
  const [range, setRange] = useState(analytics.range || 30);
  const [loading, setLoading] = useState(false);

  const setRangeAndReload = (n) => {
    if (n === range || loading) return;
    setRange(n);
    router.reload({
      data: { range: n },
      only: ['analytics'],
      preserveState: true,
      preserveScroll: true,
      onStart: () => setLoading(true),
      onFinish: () => setLoading(false),
    });
  };

  const kpis = analytics.kpis || {};
  const trend = analytics.salesTrend || { series: [], moving_average: [] };
  const byCategory = analytics.salesByCategory || { items: [] };
  const retailers = analytics.retailerRatio || { items: [] };
  const topProducts = analytics.topProducts || { items: [] };
  const topClickedProducts = analytics.topClickedProducts || { items: [] };
  const topViewedProducts = analytics.topViewedProducts || { items: [] };
  const topBrands = analytics.topBrands || { items: [] };
  const funnel = analytics.conversionFunnel || {};
  const byDevice = analytics.clicksByDevice || { items: [] };
  const sourcePages = analytics.topSourcePages || { items: [] };
  const topArticles = analytics.topArticles || { items: [] };
  const topVideos = analytics.topVideos || { items: [] };

  const [chartMetric, setChartMetric] = useState('sales');

  const trendData = (trend.series || []).map((d, i) => ({
    date: d.date.slice(5),
    sales: d.sales || 0,
    orders: d.orders || 0,
    clicks: d.clicks || 0,
    commission: d.commission || 0,
    ma: (trend.moving_average || [])[i] || 0,
  }));

  const topCategoryName = byCategory.top_category;
  const categoryData = (byCategory.items || []).slice(0, 8);
  const donutData = (retailers.items || []).map((r, i) => ({ ...r, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const deviceData = byDevice.items || [];
  const topDeviceName = deviceData[0]?.device;
  const maxSourceClicks = Math.max(1, ...((sourcePages.items || []).map((p) => p.clicks)));

  const stats = [
    { ic: 'search', num: fmtNum(kpis.clicks), lab: 'Total clicks' },
    { ic: 'check', num: fmtNum(kpis.orders), lab: 'Orders' },
    { ic: 'chart', num: fmtPct(kpis.conversion_rate), lab: 'Conversion rate' },
    { ic: 'store', num: fmtUSD(kpis.sales_volume), lab: 'Sales volume' },
    { ic: 'box', num: fmtUSD(kpis.aov), lab: 'Avg. order value' },
    { ic: 'shield', num: fmtPct(kpis.settled_rate), lab: 'Settled rate' },
    { ic: 'trendDown', num: fmtPct(kpis.reversal_rate), lab: 'Reversal rate' },
    { ic: 'sparkle', num: fmtUSD(kpis.commission_earned), lab: 'Commission earned', hero: true },
    { ic: 'star2', num: fmtUSD(kpis.epc), lab: 'EPC (per click)', hero: true },
  ];

  const getMetricFormat = (val) => {
    if (chartMetric === 'sales' || chartMetric === 'commission') return fmtUSD(val);
    return fmtNum(val);
  };

  const getMetricLabel = () => {
    if (chartMetric === 'sales') return 'Sales Volume';
    if (chartMetric === 'orders') return 'Orders Count';
    if (chartMetric === 'commission') return 'Commission Earned';
    if (chartMetric === 'clicks') return 'Clicks';
    return 'Sales';
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Analytics</h1>
          <p>Affiliate performance — sales trends, clicks, conversions, and product views.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => downloadAnalyticsReport(analytics, range)}>
            <I.download /> Download report
          </button>
          <div className="adm-range-switch">
            {[7, 14, 30].map((n) => (
              <button key={n} className={range === n ? 'active' : ''} disabled={loading} onClick={() => setRangeAndReload(n)}>{n}d</button>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-stats">
        {stats.map((s) => {
          const Icon = I[s.ic];
          return (
            <div className={'adm-stat' + (s.hero ? ' adm-stat-hero' : '')} key={s.lab}>
              <div className="ic"><Icon /></div>
              <div className="num">{s.num}</div>
              <div className="lab">{s.lab}</div>
            </div>
          );
        })}
      </div>

      {funnel.hasData && (
        <div className="adm-panel" style={{ background: 'linear-gradient(135deg, rgba(207,138,50,0.06), rgba(12,26,45,0.02))' }}>
          <h2>Conversion Funnel</h2>
          <p className="sub">Visitor engagement to outbound link clicks and confirmed order conversions.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 16 }}>
            <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>1. Product Views</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{fmtNum(funnel.product_views)}</div>
            </div>
            <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>2. "Buy Now" Clicks</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--accent)' }}>{fmtNum(funnel.buy_now_clicks)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{fmtPct(funnel.click_through_rate)} CTR</div>
            </div>
            <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>3. Confirmed Orders</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--brand)' }}>{fmtNum(funnel.orders)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{fmtPct(funnel.conversion_rate)} Conversion Rate</div>
            </div>
            <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>4. Sales Volume</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--brand)' }}>{fmtUSD(funnel.sales_volume)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Interactive Sales Graph */}
      <div className="adm-panel">
        <div className="adm-chart-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Sales & Performance Graph</h2>
            <p className="sub" style={{ margin: '4px 0 0' }}>Daily sales volume, orders, clicks, and 7-day moving trend.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {trend.hasData && (
              <span className={'adm-badge-delta ' + (trend.change_pct >= 0 ? 'up' : 'down')} style={{ marginRight: 8 }}>
                {trend.change_pct >= 0 ? <I.trendUp /> : <I.trendDown />} {Math.abs(trend.change_pct)}% vs prior {range}d
              </span>
            )}
            <div className="adm-range-switch" style={{ background: 'var(--bg)', padding: 3 }}>
              <button type="button" className={chartMetric === 'sales' ? 'active' : ''} onClick={() => setChartMetric('sales')}>Sales ($)</button>
              <button type="button" className={chartMetric === 'orders' ? 'active' : ''} onClick={() => setChartMetric('orders')}>Orders</button>
              <button type="button" className={chartMetric === 'commission' ? 'active' : ''} onClick={() => setChartMetric('commission')}>Commission</button>
              <button type="button" className={chartMetric === 'clicks' ? 'active' : ''} onClick={() => setChartMetric('clicks')}>Clicks</button>
            </div>
          </div>
        </div>

        {trend.hasData && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16, marginBottom: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8, fontSize: 13, flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: 'var(--muted)' }}>Avg. Daily Sales: </span>
              <strong>{fmtUSD(trend.avg_daily_sales)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Peak Day Sales: </span>
              <strong style={{ color: 'var(--accent)' }}>{fmtUSD(trend.peak_sales)}</strong>
              {trend.peak_date && <span style={{ color: 'var(--muted)', fontSize: 12 }}> ({trend.peak_date})</span>}
            </div>
          </div>
        )}

        {!trend.hasData ? <AnalyticsEmpty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => chartMetric === 'sales' || chartMetric === 'commission' ? `$${Math.round(v)}` : fmtNum(v)} />
              <Tooltip
                formatter={(v, name) => [
                  getMetricFormat(v),
                  name === chartMetric ? getMetricLabel() : '7-day avg'
                ]}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }}
              />
              <Area type="monotone" dataKey={chartMetric} stroke="var(--accent)" fill="url(#salesGrad)" strokeWidth={2.5} activeDot={{ r: 6, strokeWidth: 2, fill: 'var(--surface)' }} />
              {chartMetric === 'sales' && (
                <Line type="monotone" dataKey="ma" stroke="var(--brand)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="adm-grid2">
        <div className="adm-panel">
          <h2>Most clicked "Buy Now" products</h2>
          <p className="sub">Products generating the highest affiliate link outbound clicks.</p>
          {!topClickedProducts.hasData ? <AnalyticsEmpty label="No product clicks recorded yet in this range." /> : (
            <div className="adm-legend">
              {topClickedProducts.items.map((p) => (
                <div className="row" key={p.id}>
                  {p.image ? <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <span className="adm-thumb ph" style={{ width: 32, height: 32 }}><I.image width="14" height="14" /></span>}
                  <div style={{ marginLeft: 9, flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.brand}</div>
                    <div className="name">{p.name}</div>
                  </div>
                  <span className="pct" style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmtNum(p.clicks)} clicks</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="adm-panel">
          <h2>Most viewed product pages</h2>
          <p className="sub">Products with the highest detail page views.</p>
          {!topViewedProducts.hasData ? <AnalyticsEmpty label="No product views recorded yet in this range." /> : (
            <div className="adm-legend">
              {topViewedProducts.items.map((p) => (
                <div className="row" key={p.id}>
                  {p.image ? <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <span className="adm-thumb ph" style={{ width: 32, height: 32 }}><I.image width="14" height="14" /></span>}
                  <div style={{ marginLeft: 9, flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.brand}</div>
                    <div className="name">{p.name}</div>
                  </div>
                  <span className="pct">{fmtNum(p.views)} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-panel">
          <h2>Sales by category</h2>
          <p className="sub">Which categories are driving sales in this window.</p>
          {!byCategory.hasData ? <AnalyticsEmpty /> : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 34)}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 12, fill: 'var(--ink)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtUSD(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }} />
                  <Bar dataKey="sales" radius={[0, 6, 6, 0]}>
                    {categoryData.map((c, i) => (
                      <Cell key={i} fill={c.category === topCategoryName ? 'var(--accent)' : 'var(--muted)'} fillOpacity={c.category === topCategoryName ? 1 : 0.35} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {topCategoryName && (
                <p className="adm-callout">Most sold category: <strong>{topCategoryName}</strong> — {fmtUSD(categoryData[0]?.sales)}</p>
              )}
            </>
          )}
        </div>

        <div className="adm-panel">
          <h2>Retailer sales ratio</h2>
          <p className="sub">Share of sales by retailer in this window.</p>
          {!retailers.hasData ? <AnalyticsEmpty /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} dataKey="sales" nameKey="retailer" innerRadius={48} outerRadius={76} paddingAngle={1.5} stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtUSD(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="adm-legend" style={{ flex: 1, minWidth: 160 }}>
                {donutData.map((d) => (
                  <div className="row" key={d.retailer}>
                    <span className="sw" style={{ background: d.color }}></span>
                    <span className="name">{d.retailer}</span>
                    <span className="pct">{fmtPct(d.pct)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-panel">
          <h2>Clicks by device</h2>
          <p className="sub">Which devices visitors are clicking through on.</p>
          {!byDevice.hasData ? <AnalyticsEmpty /> : (
            <ResponsiveContainer width="100%" height={Math.max(140, deviceData.length * 46)}>
              <BarChart data={deviceData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="device" width={70} tick={{ fontSize: 12, fill: 'var(--ink)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, _n, entry) => [`${fmtNum(v)} clicks (${fmtPct(entry.payload.pct)})`, entry.payload.device]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }} />
                <Bar dataKey="clicks" radius={[0, 6, 6, 0]}>
                  {deviceData.map((d, i) => (
                    <Cell key={i} fill={d.device === topDeviceName ? 'var(--accent)' : 'var(--muted)'} fillOpacity={d.device === topDeviceName ? 1 : 0.35} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="adm-panel">
          <h2>Top source pages</h2>
          <p className="sub">Where on the site clicks are coming from.</p>
          {!sourcePages.hasData ? <AnalyticsEmpty /> : (
            <div className="adm-legend">
              {sourcePages.items.map((p) => (
                <div className="row" key={p.page}>
                  <span className="name" style={{ flex: '0 0 150px', fontFamily: 'monospace', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</span>
                  <span style={{ flex: 1, background: 'var(--bg)', borderRadius: 999, height: 6, overflow: 'hidden', margin: '0 10px' }}>
                    <span style={{ display: 'block', height: '100%', width: `${(p.clicks / maxSourceClicks) * 100}%`, background: 'var(--accent)', borderRadius: 999 }}></span>
                  </span>
                  <span className="pct">{fmtNum(p.clicks)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-panel">
          <h2>Top journals / articles</h2>
          <p className="sub">Most-read Journal posts in this window.</p>
          {!topArticles.hasData ? <AnalyticsEmpty label="No article views yet in this range." /> : (
            <div className="adm-legend">
              {topArticles.items.map((a) => (
                <div className="row" key={a.slug}>
                  {a.img ? <img src={a.img} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <span className="adm-thumb ph" style={{ width: 32, height: 32 }}><I.image width="14" height="14" /></span>}
                  <span className="name" style={{ marginLeft: 9 }}>{a.title}</span>
                  <span className="pct">{fmtNum(a.views)} reads</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="adm-panel">
          <h2>Top videos</h2>
          <p className="sub">Most-played videos in this window.</p>
          {!topVideos.hasData ? <AnalyticsEmpty label="No video plays yet in this range." /> : (
            <div className="adm-legend">
              {topVideos.items.map((v, i) => (
                <div className="row" key={i}>
                  {v.thumb ? <img src={v.thumb} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <span className="adm-thumb ph" style={{ width: 32, height: 32 }}><I.image width="14" height="14" /></span>}
                  <span className="name" style={{ marginLeft: 9 }}>{v.title}</span>
                  <span className="pct">{fmtNum(v.views)} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-panel">
        <h2>Top 5 most sold products</h2>
        <p className="sub">Ranked by units sold in this window.</p>
        {!topProducts.hasData ? <AnalyticsEmpty /> : (
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Category</th><th>Retailer</th><th>Units</th><th>Sales</th><th>Commission</th></tr>
              </thead>
              <tbody>
                {topProducts.items.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--muted)', fontWeight: 700 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.image ? <img className="adm-thumb" src={p.image} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}
                        <div>
                          <div className="adm-pbrand">{p.brand}</div>
                          <div className="adm-pname">{p.name}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="adm-tag cat">{p.category}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{p.retailer}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(p.units)}</td>
                    <td style={{ fontFamily: 'var(--font-display,serif)', color: 'var(--brand)' }}>{fmtUSD(p.sales)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--accent)', fontWeight: 700 }}>{fmtUSD(p.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
