const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadColors() {
  const tsPath = path.resolve(__dirname, '../src/theme/colors.ts');
  const tsCode = fs.readFileSync(tsPath, 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;

  const m = { exports: {} };
  const { clientConfig } = require('./load-client-config');
  const fn = new Function('require', 'module', 'exports', jsCode);
  fn(
    (id) => {
      if (id.includes('client.config')) return { clientConfig, default: clientConfig };
      return require(id);
    },
    m,
    m.exports
  );
  return m.exports;
}

module.exports = loadColors();
