// Prices are stored as free-form strings, not a decimal column. The admin form already
// prepends "$" itself when saving unless the value already carries some other currency
// symbol (see ProductsView.jsx's submit()), and Product::toFrontend() mirrors that same
// rule server-side — but this is a second, cheap belt-and-suspenders pass at display time
// so a price ever reaches the storefront bare (e.g. from a source that bypasses both of
// those), it still renders with a symbol rather than a naked number.
export function formatPrice(price) {
  const value = String(price ?? '').trim();
  return value !== '' && /^[0-9.,]+$/.test(value) ? `$${value}` : value;
}
