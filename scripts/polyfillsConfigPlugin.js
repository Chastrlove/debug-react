const fs = require("fs");
const path = require("path");

const makeEntry = (entry, initEntry) => {
  if (typeof entry === "object" && !Array.isArray(entry)) {
    Object.keys(entry).forEach((e) => {
      entry[e] = makeEntry(entry[e], initEntry);
    });
    return entry;
  }
  if (typeof entry === "string") {
    return [initEntry, entry];
  }
  if (Array.isArray(entry)) {
    return [initEntry].concat(entry);
  }
  if (typeof entry === "function") {
    return async () => {
      const originalEntry = await entry();
      return makeEntry(originalEntry, initEntry);
    };
  }
};

class PolyfillsConfigPlugin {
  constructor(options = {}) {
    const { polyfill, native, featureDetection } = options;
    this.usePolyfill = polyfill;
    this.useNative = native;
    this.useFeatureDetection = featureDetection;
  }
  apply(compiler) {
    const initFilePath = path.resolve(__dirname, "polyfill_config.js");
    const code = `var configurator = require('core-js/configurator');
configurator({
  useNative: ${JSON.stringify(
    this.useNative
  )},    // polyfills will be used only if natives completely unavailable
  usePolyfill: ${JSON.stringify(this.usePolyfill)}, // polyfills will be used anyway
  useFeatureDetection: ${JSON.stringify(this.useFeatureDetection)},
});
    `;
    const { entry } = compiler.options;
    fs.writeFileSync(initFilePath, code);
    const initEntry = require.resolve(initFilePath);
    compiler.options.entry = makeEntry(entry, initEntry);
  }
}

module.exports = PolyfillsConfigPlugin;
