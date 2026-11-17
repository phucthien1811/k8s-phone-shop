// Gọi API backend; lưu lại Pod/node đã phục vụ request gần nhất (header X-Served-By)
const listeners = new Set();
export let lastServedBy = null;

export function onServedBy(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const pod = res.headers.get('X-Served-By');
  if (pod) {
    lastServedBy = { pod, node: res.headers.get('X-Node-Name') };
    listeners.forEach((fn) => fn(lastServedBy));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

export const vnd = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';
