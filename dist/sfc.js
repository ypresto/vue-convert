"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const component_compiler_utils_1 = require("@vue/component-compiler-utils");
const vueCompiler = require("./vendor/sfc-parser");
function convertSfcSource(source, file, converter) {
    const sfc = component_compiler_utils_1.parse({
        source,
        compiler: vueCompiler,
        compilerParseOptions: { pad: 'space' },
        needMap: false
    });
    if (!sfc.script) {
        console.warn(`${file}: No <script> section. Nothing to do.`);
        return null;
    }
    const prefix = source.slice(0, sfc.script.start);
    const suffix = source.slice(sfc.script.end);
    const strippedScript = sfc.script.content.slice(sfc.script.start, sfc.script.end);
    const convertedScript = converter(strippedScript, file);
    if (convertedScript === null)
        return null;
    return prefix + convertedScript + suffix;
}
exports.convertSfcSource = convertSfcSource;
