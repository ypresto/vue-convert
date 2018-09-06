import { parse as parseVueSFC } from '@vue/component-compiler-utils'
import * as vueCompiler from './vendor/sfc-parser'

export function convertSfcSource(
  source: string,
  file: string,
  converter: (script: string, file: string) => string | null
): string | null {
  const sfc = parseVueSFC({
    source,
    compiler: vueCompiler as any, // NOTE: compile() and ssrCompile() methods are missing.
    compilerParseOptions: { pad: 'space' },
    needMap: false
  })
  if (!sfc.script) {
    console.warn(`${file}: No <script> section. Nothing to do.`)
    return null
  }
  const prefix = source.slice(0, sfc.script.start)
  const suffix = source.slice(sfc.script.end)

  const strippedScript = sfc.script.content.slice(sfc.script.start, sfc.script.end)
  const convertedScript = converter(strippedScript, file)
  if (convertedScript === null) return null
  return prefix + convertedScript + suffix
}
