/** ส่ง signal ให้ sidebar refresh badge ทันที */
export function notifyOrdersUpdated() {
  try {
    new BroadcastChannel("winx:orders").postMessage("updated");
  } catch { /* ไม่รองรับใน environment นั้น */ }
}
