/** נמלי דמה לבחירת יעד בחישוב הגעה (קואורדינטות מקורבות) */
export const PORTS = [
  { id: 'haifa', name: 'Haifa', country: 'ישראל', lat: 32.82, lon: 35.0 },
  { id: 'ashdod', name: 'Ashdod', country: 'ישראל', lat: 31.82, lon: 34.64 },
  { id: 'piraeus', name: 'Piraeus', country: 'יוון', lat: 37.94, lon: 23.63 },
  { id: 'limassol', name: 'Limassol', country: 'קפריסין', lat: 34.65, lon: 33.02 },
  { id: 'portsaid', name: 'Port Said', country: 'מצרים', lat: 31.27, lon: 32.31 },
  { id: 'istanbul', name: 'Istanbul', country: 'טורקיה', lat: 41.0, lon: 28.97 },
  { id: 'valletta', name: 'Valletta', country: 'מלטה', lat: 35.9, lon: 14.52 },
  { id: 'suez', name: 'Suez', country: 'מצרים', lat: 29.96, lon: 32.55 },
  { id: 'jeddah', name: 'Jeddah', country: 'סעודיה', lat: 21.48, lon: 39.17 },
  { id: 'jebelali', name: 'Jebel Ali', country: 'איחוד האמירויות', lat: 25.01, lon: 55.06 },
];

export const searchPorts = (q) => {
  const s = q.trim().toLowerCase();
  if (!s) return PORTS;
  return PORTS.filter((p) => p.name.toLowerCase().includes(s) || p.country.includes(s));
};
