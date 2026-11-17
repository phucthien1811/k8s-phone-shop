// Hình minh họa điện thoại vẽ bằng SVG (không dùng ảnh có bản quyền)
export default function PhoneImage({ color = '#1677ff', brand = '', height = 180 }) {
  const gid = `g${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 200 220" height={height} width="100%" role="img" aria-label={brand}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="220" fill="#f5f7fa" />
      <rect x="62" y="18" width="76" height="160" rx="14" fill="#1f1f1f" />
      <rect x="66" y="22" width="68" height="152" rx="11" fill={`url(#${gid})`} />
      <rect x="88" y="27" width="24" height="6" rx="3" fill="#1f1f1f" />
      <text x="100" y="205" textAnchor="middle" fontSize="15" fontFamily="sans-serif" fill="#555">{brand}</text>
    </svg>
  );
}
