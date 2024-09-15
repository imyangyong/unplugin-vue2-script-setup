import MagicString from 'magic-string'
import { shouldTransform as shouldTransformRefSugar, transform as transformRef } from '@vue/reactivity-transform'
import type { ResolvedOptions, ScriptSetupTransformOptions, TransformResult } from '../types'
import { parseSFC } from './parseSFC'
import { transformScriptSetup } from './transformScriptSetup'
import { transformSfcRefSugar } from './transformSfcRefSugar'
import { resolveOptions } from './options'

export const scriptSetupRE = /<script\s+(.*\s+)?setup(\s+.*)?\s*>/

export function shouldTransform(code: string, id: string, options?: ScriptSetupTransformOptions): boolean {
  // avoid transforming twice
  if (code.includes('export default __sfc_main'))
    return false
  return (options?.reactivityTransform && shouldTransformRefSugar(code)) || scriptSetupRE.test(code)
}

export async function transform(input: string, id: string, options?: ScriptSetupTransformOptions): Promise<TransformResult> {
  if (!shouldTransform(input, id, options))
    return null
  const resolved = resolveOptions(options)
  if (id.endsWith('.vue') || id.includes('.vue?vue'))
    return await transformVue(input, id, resolved)
  else
    return transformNonVue(input, id, resolved)
}

function transformNonVue(input: string, id: string, options: ResolvedOptions): TransformResult {
  if (options.reactivityTransform && shouldTransformRefSugar(input)) {
    return transformRef(input, {
      filename: id,
      sourceMap: options.sourceMap,
      importHelpersFrom: options.importHelpersFrom,
    }) as any
  }
  return null
}

async function transformVue(input: string, id: string, options: ResolvedOptions): Promise<TransformResult> {
  const s = new MagicString(input)

  const sfc = await parseSFC(input, id)

  if (options.reactivityTransform)
    transformSfcRefSugar(sfc, options)

  const { code } = transformScriptSetup(sfc, s, options)

  const attributes = {
    ...sfc.script.attrs,
    ...sfc.scriptSetup.attrs,
  }
  delete attributes.setup
  const attr = Object.entries(attributes)
    .map(([key, value]) => value ? `${key}="${value}"` : key)
    .join(' ')

  if (code) {
    const block = `<script ${attr}>\n${code}\n</script>`

    s.remove(sfc.script.start, sfc.script.end)
    if (sfc.scriptSetup.start !== sfc.scriptSetup.end) {
      s.overwrite(
        sfc.scriptSetup.start,
        sfc.scriptSetup.end,
        block,
      )
    }
    else {
      s.prependLeft(0, `${block}\n`)
    }
  }

  return {
    code: s.toString(),
    map: options.sourceMap
      ? s.generateMap({
        source: id,
        includeContent: true,
      }) as any
      : null,
  }
}
