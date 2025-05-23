function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      deepMerge(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
  return target;
}

function extractDomain(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

module.exports = { deepMerge, extractDomain };
