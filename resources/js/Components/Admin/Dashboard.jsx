import I from '../Icons';

export default function Dashboard({ productsCount, featuredCount, resortCount, linkedCount, recentProducts, onGo }) {
  const stats = [
    { ic: 'box', num: productsCount, lab: 'Total products' },
    { ic: 'sparkle', num: featuredCount, lab: 'Featured products' },
    { ic: 'star2', num: resortCount, lab: 'Resort picks' },
    { ic: 'grid', num: linkedCount, lab: 'Products linked' },
  ];
  const recent = recentProducts || [];
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p>Manage your affiliate catalog — products, categories, and homepage content.</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => onGo('products')}><I.plus /> Add product</button>
      </div>
      <div className="adm-stats">
        {stats.map((s) => {
          const Icon = I[s.ic];
          return (
            <div className="adm-stat" key={s.lab}>
              <div className="ic"><Icon /></div>
              <div className="num">{s.num}</div>
              <div className="lab">{s.lab}</div>
            </div>
          );
        })}
      </div>
      <div className="adm-panel">
        <h2>Recently added</h2>
        <p className="sub">The latest products in your catalog.</p>
        {recent.length === 0 ? (
          <div className="adm-empty" style={{ padding: '40px 20px' }}>
            <I.box width="42" height="42" />
            <h3>No products yet</h3>
            <p>Add your first affiliate product to see it live on the storefront.</p>
            <button className="adm-btn adm-btn-primary" onClick={() => onGo('products')}><I.plus /> Add your first product</button>
          </div>
        ) : (
          <table className="adm-table">
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 60 }}>{p.image ? <img className="adm-thumb" src={p.image} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}</td>
                  <td><div className="adm-pbrand">{p.brand}</div><div className="adm-pname">{p.name}</div></td>
                  <td><span className="adm-tag cat">{p.category}</span></td>
                  <td style={{ fontFamily: 'var(--font-display,serif)', color: 'var(--brand)', fontSize: 16 }}>{p.price}</td>
                  <td className="adm-row-actions"><button className="adm-icon" onClick={() => onGo('products')} aria-label="Manage"><I.edit /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
