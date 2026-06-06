// icon.jsx — Lucide-backed icon (web substitute for Ionicons, per the design
// system). Renders inline SVG from the bundled Lucide IconNode data — no runtime
// per-icon fetch, so it works offline. `name` is a Lucide PascalCase id.
function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, fill = 'none', style = {} }) {
  const L = window.lucide;
  const node = L && (L.icons ? L.icons[name] : L[name]) || (L && L[name]);
  if (!node || !Array.isArray(node)) return null;
  const kids = node[2] || [];
  const inner = kids.map(([tag, attrs]) => {
    const a = Object.entries(attrs || {}).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a}></${tag}>`;
  }).join('');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: inner }} />
  );
}
window.Icon = Icon;
