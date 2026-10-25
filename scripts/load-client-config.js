const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function getClientConfig() {
  const tsPath = path.resolve(__dirname, '../src/config/client.config.ts');
  const tsCode = fs.readFileSync(tsPath, 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;

  const m = { exports: {} };
  const fn = new Function('require', 'module', 'exports', jsCode);
  fn(require, m, m.exports);
  return m.exports.clientConfig || m.exports.default;
}

const clientConfig = getClientConfig();

module.exports = {
  clientConfig,
  getClientConfig,
};
