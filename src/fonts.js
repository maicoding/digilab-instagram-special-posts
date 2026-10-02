const DB_NAME = 'digilab-special-posts-fonts';
const FAMILY = 'PostFont';
const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore('fonts', { keyPath: 'weight' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const storedFonts = async (record) => {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('fonts', record ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('fonts');
      const request = record ? store.put(record) : store.getAll();
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
};
const register = async ({ bytes, weight, name }) => {
  const face = new FontFace(FAMILY, bytes, { style: 'normal', weight });
  await face.load();
  for (const existing of document.fonts) {
    if (existing.family === FAMILY && existing.weight === weight) document.fonts.delete(existing);
  }
  document.fonts.add(face);
  return { family: FAMILY, weight, name };
};
export const loadLocalDegular = async () => {
  const cuts = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Black' };
  const loaded = await Promise.all(Object.entries(cuts).map(async ([weight, cut]) => {
    try {
      const face = new FontFace('Degular', `local("Degular ${cut}"), local("Degular-${cut}")${weight === '400' ? ', local("Degular")' : ''}`, { weight });
      await face.load();
      document.fonts.add(face);
      return { family: 'Degular', weight, name: `Degular ${cut}` };
    } catch { return null; }
  }));
  return loaded.filter(Boolean);
};
export const restoreFonts = async () => {
  try {
    const records = await storedFonts();
    const results = await Promise.allSettled(records.map(register));
    return results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  } catch { return []; }
};
export const importFont = async (file, weight) => {
  if (!/\.(otf|ttf|woff2?)$/i.test(file.name) || file.size > 20 * 1024 * 1024) throw new Error('Ungültige Schriftdatei');
  const record = { bytes: await file.arrayBuffer(), weight, name: file.name };
  const font = await register(record);
  try { await storedFonts(record); font.saved = true; } catch { font.saved = false; }
  return font;
};
