import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import I from '../Icons';
import { csvCell } from './AdminShared';

const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

function AnalyticsEmpty({ label = 'No activity recorded yet in this range.' }) {
  return <div className="adm-empty" style={{ padding: '32px 20px' }}><I.chart width="34" height="34" /><h3 style={{ fontSize: 16 }}>No analytics data yet</h3><p style={{ marginBottom: 0 }}>{label}</p></div>;
}

function downloadAnalyticsReport(analytics, range) {
  const lines = [];
  const push = (row) => lines.push(row.map(csvCell).join(','));
  const kpis = analytics.kpis || {};
  push([`Limitra Activity Report — last ${range} days`]); push([]);
  push(['KPI', 'Value']);
  push(['Product views', kpis.product_views ?? 0]);
  push(['Outbound clicks', kpis.clicks ?? 0]);
  push(['Click-through rate (%)', kpis.click_through_rate ?? 0]); push([]);
  push(['Daily outbound clicks']); push(['Date', 'Clicks']);
  (analytics.clickTrend?.series || []).forEach((d) => push([d.date, d.clicks])); push([]);
  push(['Clicks by device']); push(['Device', 'Clicks', 'Share (%)']);
  (analytics.clicksByDevice?.items || []).forEach((d) => push([d.device, d.clicks, d.pct])); push([]);
  push(['Top source pages']); push(['Page', 'Clicks']);
  (analytics.topSourcePages?.items || []).forEach((p) => push([p.page, p.clicks])); push([]);
  push(['Most-clicked products']); push(['Product', 'Brand', 'Clicks']);
  (analytics.topClickedProducts?.items || []).forEach((p) => push([p.name, p.brand, p.clicks]));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `activity-report-${range}d.csv`; a.click(); URL.revokeObjectURL(url);
}

function ProductList({ title, subtitle, items, metric, emptyLabel }) {
  return <div className="adm-panel"><h2>{title}</h2><p className="sub">{subtitle}</p>
    {!items?.hasData ? <AnalyticsEmpty label={emptyLabel} /> : <div className="adm-legend">{items.items.map((p) => <div className="row" key={p.id}>
      {p.image ? <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <span className="adm-thumb ph" style={{ width: 32, height: 32 }}><I.image width="14" height="14" /></span>}
      <div style={{ marginLeft: 9, flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.brand}</div><div className="name">{p.name}</div></div>
      <span className="pct" style={{ color: metric === 'clicks' ? 'var(--accent)' : undefined, fontWeight: metric === 'clicks' ? 700 : undefined }}>{fmtNum(p[metric])} {metric}</span>
    </div>)}</div>}</div>;
}

export default function AnalyticsView({ analytics }) {
  const [range, setRange] = useState(analytics.range || 30);
  const [loading, setLoading] = useState(false);
  const setRangeAndReload = (n) => { if (n === range || loading) return; setRange(n); router.reload({ data: { range: n }, only: ['analytics'], preserveState: true, preserveScroll: true, onStart: () => setLoading(true), onFinish: () => setLoading(false) }); };
  const kpis = analytics.kpis || {};
  const trend = analytics.clickTrend || { series: [] };
  const byDevice = analytics.clicksByDevice || { items: [] };
  const sourcePages = analytics.topSourcePages || { items: [] };
  const topArticles = analytics.topArticles || { items: [] };
  const topVideos = analytics.topVideos || { items: [] };
  const topBrands = analytics.topBrands || { items: [] };
  const maxSourceClicks = Math.max(1, ...((sourcePages.items || []).map((p) => p.clicks)));
  const topDeviceName = byDevice.items?.[0]?.device;

  return <>
    <div className="adm-head"><div><h1>Analytics</h1><p>On-site product discovery and outbound-link engagement.</p></div><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => downloadAnalyticsReport(analytics, range)}><I.download /> Download report</button>
      <div className="adm-range-switch">{[7, 14, 30].map((n) => <button key={n} className={range === n ? 'active' : ''} disabled={loading} onClick={() => setRangeAndReload(n)}>{n}d</button>)}</div>
    </div></div>

    <div className="adm-stats">
      {[{ ic: 'search', num: fmtNum(kpis.product_views), lab: 'Product views' }, { ic: 'check', num: fmtNum(kpis.clicks), lab: 'Outbound clicks' }, { ic: 'chart', num: fmtPct(kpis.click_through_rate), lab: 'Click-through rate' }].map((s) => { const Icon = I[s.ic]; return <div className="adm-stat" key={s.lab}><div className="ic"><Icon /></div><div className="num">{s.num}</div><div className="lab">{s.lab}</div></div>; })}
    </div>

    <div className="adm-panel"><div className="adm-chart-head"><div><h2 style={{ margin: 0 }}>Outbound click trend</h2><p className="sub" style={{ margin: '4px 0 0' }}>Daily clicks from Limitra to retailer product pages.</p></div>{trend.hasData && <span className={'adm-badge-delta ' + (trend.change_pct >= 0 ? 'up' : 'down')}>{trend.change_pct >= 0 ? <I.trendUp /> : <I.trendDown />} {Math.abs(trend.change_pct)}% vs prior {range}d</span>}</div>
      {trend.hasData ? <><div style={{ display: 'flex', gap: 24, margin: '16px 0', padding: '12px 16px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}><span><span style={{ color: 'var(--muted)' }}>Average daily clicks: </span><strong>{fmtNum(trend.avg_daily_clicks)}</strong></span><span><span style={{ color: 'var(--muted)' }}>Peak day: </span><strong>{fmtNum(trend.peak_clicks)}</strong>{trend.peak_date && <span style={{ color: 'var(--muted)' }}> ({trend.peak_date})</span>}</span></div>
        <ResponsiveContainer width="100%" height={280}><AreaChart data={(trend.series || []).map((d) => ({ ...d, date: d.date.slice(5) }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}><defs><linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--line)' }} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip formatter={(v) => [fmtNum(v), 'Outbound clicks']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5 }} /><Area type="monotone" dataKey="clicks" stroke="var(--accent)" fill="url(#clickGrad)" strokeWidth={2.5} activeDot={{ r: 6 }} /></AreaChart></ResponsiveContainer></> : <AnalyticsEmpty />}
    </div>

    <div className="adm-grid2"><ProductList title={'Most clicked “Buy Now” products'} subtitle="Products generating the most outbound retailer clicks." items={analytics.topClickedProducts} metric="clicks" emptyLabel="No product clicks recorded yet in this range." /><ProductList title="Most viewed product pages" subtitle="Products with the highest detail-page views." items={analytics.topViewedProducts} metric="views" emptyLabel="No product views recorded yet in this range." /></div>
    <div className="adm-grid2"><div className="adm-panel"><h2>Clicks by device</h2><p className="sub">Devices visitors use when clicking to retailers.</p>{!byDevice.hasData ? <AnalyticsEmpty /> : <ResponsiveContainer width="100%" height={Math.max(140, byDevice.items.length * 46)}><BarChart data={byDevice.items} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="device" width={70} tick={{ fontSize: 12, fill: 'var(--ink)' }} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => [`${fmtNum(v)} clicks`, '']} /><Bar dataKey="clicks" radius={[0, 6, 6, 0]}>{byDevice.items.map((d, i) => <Cell key={i} fill={d.device === topDeviceName ? 'var(--accent)' : 'var(--muted)'} fillOpacity={d.device === topDeviceName ? 1 : 0.35} />)}</Bar></BarChart></ResponsiveContainer>}</div>
      <div className="adm-panel"><h2>Top source pages</h2><p className="sub">Where your outbound clicks are coming from.</p>{!sourcePages.hasData ? <AnalyticsEmpty /> : <div className="adm-legend">{sourcePages.items.map((p) => <div className="row" key={p.page}><span className="name" style={{ flex: '0 0 150px', fontFamily: 'monospace', fontSize: 12.5 }}>{p.page}</span><span style={{ flex: 1, background: 'var(--bg)', borderRadius: 999, height: 6, overflow: 'hidden', margin: '0 10px' }}><span style={{ display: 'block', height: '100%', width: `${(p.clicks / maxSourceClicks) * 100}%`, background: 'var(--accent)', borderRadius: 999 }} /></span><span className="pct">{fmtNum(p.clicks)}</span></div>)}</div>}</div></div>
    <div className="adm-grid2"><div className="adm-panel"><h2>Top journals / articles</h2><p className="sub">Most-read Journal posts in this window.</p>{!topArticles.hasData ? <AnalyticsEmpty /> : <div className="adm-legend">{topArticles.items.map((a) => <div className="row" key={a.slug}><span className="name">{a.title}</span><span className="pct">{fmtNum(a.views)} reads</span></div>)}</div>}</div><div className="adm-panel"><h2>Top videos</h2><p className="sub">Most-played videos in this window.</p>{!topVideos.hasData ? <AnalyticsEmpty /> : <div className="adm-legend">{topVideos.items.map((v, i) => <div className="row" key={i}><span className="name">{v.title}</span><span className="pct">{fmtNum(v.views)} views</span></div>)}</div>}</div></div>
    <div className="adm-panel"><h2>Top brands by outbound clicks</h2><p className="sub">Brands whose products receive the most retailer clicks.</p>{!topBrands.hasData ? <AnalyticsEmpty /> : <div className="adm-legend">{topBrands.items.map((b) => <div className="row" key={b.brand}><span className="name">{b.brand}</span><span className="pct">{fmtNum(b.clicks)} clicks</span></div>)}</div>}</div>
  </>;
}
