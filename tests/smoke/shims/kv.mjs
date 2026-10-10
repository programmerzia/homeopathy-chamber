const m = new Map(); export default { getItemSync: (k) => m.get(k) ?? null, setItemSync: (k, v) => m.set(k, v) };
