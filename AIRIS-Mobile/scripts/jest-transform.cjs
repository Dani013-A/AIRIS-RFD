const ts = require('typescript');
const babel = require('@babel/core');
module.exports = {
  process(source, filename) {
    const output = ts.transpileModule(source, {
      compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX},
      fileName: filename,
    }).outputText;
    return {code: babel.transformSync(output, {plugins: [require('babel-plugin-jest-hoist')], configFile: false, babelrc: false}).code};
  },
};
