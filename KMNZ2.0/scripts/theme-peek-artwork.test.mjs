import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
import {loadTypeScript} from './load-typescript.mjs'

const peek=await loadTypeScript(new URL('../src/lib/themePeek.ts',import.meta.url))
const source=await readFile(new URL('../src/components/ThemePeek.tsx',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
test('navigation actions select supplied LITA artwork and retain the exact theme animation host and placement',()=>{
  const prior=Object.getOwnPropertyDescriptor(globalThis,'window')
  Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:1280,innerHeight:900}})
  const react={useState:value=>[typeof value==='function'?value():value,()=>{}],useRef:()=>({current:null}),useCallback:fn=>fn,useEffect(){},useReducer:()=>[peek.initialPeek,()=>{}]}
  const node=(type,props)=>({type,props}),module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:node,jsxs:node}:name==='../lib/themePeek'?peek:{__esModule:true,default:name},module,module.exports)
  try {
    for(const theme of ['light','dark']) {
      const normal=module.exports.default({theme,onFinished(){}})
      assert(normal.props.children.props.children.props.src.endsWith(theme==='dark'?'NEROB.png':'TINAW.png'))
      for(const [artwork,file] of [['close','LITACLOSE.png'],['open','LITAOPEN.png']]) {
        const tree=module.exports.default({theme,artwork,id:10,onFinished(){}})
        assert(tree.props.children.props.children.props.src.endsWith(file))
        assert.equal(tree.props.className,normal.props.className)
        assert.equal(tree.props.children.props.className,normal.props.children.props.className)
        assert.deepEqual(tree.props.style,normal.props.style)
        assert.equal(tree.props['data-theme'],theme)
      }
    }
  } finally {if(prior)Object.defineProperty(globalThis,'window',prior);else delete globalThis.window}
})
