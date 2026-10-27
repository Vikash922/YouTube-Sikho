const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const ts = require('typescript');

const transpiledCache = new Map();

function evaluateTsFile(filePath) {
  if (transpiledCache.has(filePath)) {
    return transpiledCache.get(filePath);
  }

  const tsCode = fs.readFileSync(filePath, 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;

  const m = { exports: {} };
  const baseRequire = createRequire(filePath);

  const customRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      const resolvedBase = path.resolve(path.dirname(filePath), specifier);
      const candidates = [
        resolvedBase,
        `${resolvedBase}.ts`,
        `${resolvedBase}.tsx`,
        `${resolvedBase}.js`,
        path.join(resolvedBase, 'index.ts'),
        path.join(resolvedBase, 'index.js'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          if (cand.endsWith('.ts') || cand.endsWith('.tsx')) {
            return evaluateTsFile(cand);
          }
          return baseRequire(cand);
        }
      }
    }
    return baseRequire(specifier);
  };

  const fn = new Function('require', 'module', 'exports', '__dirname', '__filename', jsCode);
  fn(customRequire, m, m.exports, path.dirname(filePath), filePath);
  transpiledCache.set(filePath, m.exports);
  return m.exports;
}

function getClientConfig() {
  const tsPath = path.resolve(__dirname, '../src/config/client.config.ts');
  const exp = evaluateTsFile(tsPath);
  return exp.clientConfig || exp.default;
}

function getClientConfigByName(clientName) {
  const tsPath = path.resolve(__dirname, `../clients/${clientName}/client.config.ts`);
  const exp = evaluateTsFile(tsPath);
  return exp.clientConfig || exp.default;
}

function getValidator() {
  const schemaPath = path.resolve(__dirname, '../src/config/schema.ts');
  const exp = evaluateTsFile(schemaPath);
  return exp.validateClientConfig;
}

module.exports = {
  getClientConfig,
  getClientConfigByName,
  getValidator,
  get clientConfig() {
    return getClientConfig();
  },
};
