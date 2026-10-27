import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve, dirname, extname } from 'node:path'
import ts from 'typescript'

export async function loadTypeScript(url) {
  const modules = new Map()
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports
    const module = { exports: {} }
    modules.set(file, module)
    if (extname(file) === '.json') {
      module.exports = JSON.parse(readFileSync(file, 'utf8'))
      return module.exports
    }
    const source = readFileSync(file, 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText
    const nativeRequire = createRequire(file)
    const localRequire = specifier => {
      if (!specifier.startsWith('.')) return nativeRequire(specifier)
      const target = resolve(dirname(file), specifier)
      return load(extname(target) ? target : target + '.ts')
    }
    new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
    return module.exports
  }
  return load(fileURLToPath(url))
}
