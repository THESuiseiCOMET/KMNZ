import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {parsePlaybackPreferences:parse,readPlaybackPreferences:read,playbackPreferencesKey}=await loadTypeScript(new URL('../src/lib/playbackPreferences.ts',import.meta.url))

test('missing or corrupt preferences preserve the floating and independent video frost defaults',()=>{
  for(const value of [null,'bad json','null','[]','42','{"presentation":"unknown"}']) assert.deepEqual(parse(value),{presentation:'floating',cinemaVideoFrosted:true,floatingBackgroundFrosted:true})
})
test('presentation and video frost survive serialization without legacy image frost',()=>{
  const saved={presentation:'cinema',cinemaVideoFrosted:false,floatingBackgroundFrosted:false}
  assert.deepEqual(parse(JSON.stringify(saved)),saved)
  assert.deepEqual(parse(JSON.stringify({...saved,presentation:'floating'})),{...saved,presentation:'floating'})
  assert.deepEqual(parse('{"presentation":"cinema","frosted":{"floating":"false","cinema":false}}'),{presentation:'cinema',cinemaVideoFrosted:true,floatingBackgroundFrosted:true})
  const first=parse(null);first.cinemaVideoFrosted=false;assert.equal(parse(null).cinemaVideoFrosted,true)
})
test('storage failures cannot prevent the website from opening',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage')
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw new Error('blocked')}}})
    assert.deepEqual(read(),parse(null))
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(key){assert.equal(key,playbackPreferencesKey);return '{"presentation":"cinema"}'}}})
    assert.equal(read().presentation,'cinema')
  } finally { if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage }
})

test('legacy floating frost migrates without changing independent cinema video frost',()=>{
  const old=parse('{"presentation":"cinema","frosted":{"floating":false,"cinema":false}}')
  assert.equal(old.cinemaVideoFrosted,true)
  assert.equal(old.floatingBackgroundFrosted,false)
  assert.equal(Object.hasOwn(old,'frosted'),false)
  assert.deepEqual(parse(JSON.stringify({presentation:'cinema',frosted:{floating:false,cinema:true},cinemaVideoFrosted:false})),{presentation:'cinema',cinemaVideoFrosted:false,floatingBackgroundFrosted:false})
  assert.equal(parse('{"cinemaVideoFrosted":"false"}').cinemaVideoFrosted,true)
  assert.equal(parse('{"cinemaVideoFrosted":false}').cinemaVideoFrosted,false)
})

test('floating and cinema frost remain independent and explicitly saved values beat legacy values',()=>{
  const saved={presentation:'floating',cinemaVideoFrosted:false,floatingBackgroundFrosted:true}
  assert.deepEqual(parse(JSON.stringify({...saved,frosted:{floating:false}})),saved)
  assert.equal(parse('{"floatingBackgroundFrosted":"false"}').floatingBackgroundFrosted,true)
  assert.equal(parse('{"floatingBackgroundFrosted":false}').floatingBackgroundFrosted,false)
})

test('Spotify stays floating for either saved preference without overwriting the YouTube choice',async()=>{
  const {resolvePlayerPresentation:resolve}=await loadTypeScript(new URL('../src/lib/playbackPreferences.ts',import.meta.url))
  for(const preferred of ['floating','cinema']){
    assert.equal(resolve('spotify',preferred),'floating')
    assert.equal(resolve('youtube',preferred),preferred)
    assert.equal(resolve(undefined,preferred),preferred)
  }
})
