// Prices are stored as free-form strings, not a decimal column, and reach the frontend two
// ways: "$1234.5" (typed by hand in the admin form, or already normalized by
// Product::displayPrice() server-side) or a bare "1234.5" (e.g. from a source that bypasses
// both of those, like the ProductPicker extension's stripped-number upload). Both need a "$"
// when missing AND thousand-separator commas either way, so this handles both shapes in one
// pass rather than requiring the caller to know which one it has.
export function formatPrice(price) {
  const value = String(price ?? '').trim();
  if (value === '') return value;

  // A single optional leading currency symbol, then a plain number — commas already in the
  // input are allowed here and stripped below so they get redone cleanly rather than
  // double-punctuated. Anything else (a price range, "Free", multiple numbers, letters) is left
  // exactly as-is rather than risking a bad mangle of a shape this wasn't meant to handle.
  const match = value.match(/^([^0-9]?)([0-9][0-9,]*(?:\.[0-9]+)?)$/);
  if (!match) return value;

  const symbol = match[1] || '$'; // admin/backend already default to "$" when none is given
  const [intPart, decPart] = match[2].replace(/,/g, '').split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${withCommas}${decPart !== undefined ? '.' + decPart : ''}`;
}
