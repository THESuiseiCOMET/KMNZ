import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {parsePlaybackPreferences:parse,readPlaybackPreferences:read,playbackPreferencesKey}=await loadTypeScript(new URL('../src/lib/playbackPreferences.ts',import.meta.url))

test('missing or corrupt preferences preserve the current floating and frosted defaults',()=>{
  for(const value of [null,'bad json','null','[]','42','{"presentation":"unknown"}']) assert.deepEqual(parse(value),{presentation:'floating',frosted:{floating:true,cinema:true},cinemaVideoFrosted:true})
})
test('presentation and frost choices are independent and survive serialization',()=>{
  const saved={presentation:'cinema',frosted:{floating:false,cinema:true},cinemaVideoFrosted:false}
  assert.deepEqual(parse(JSON.stringify(saved)),saved)
  assert.deepEqual(parse(JSON.stringify({...saved,presentation:'floating'})),{...saved,presentation:'floating'})
  assert.deepEqual(parse('{"presentation":"cinema","frosted":{"floating":"false","cinema":false}}'),{presentation:'cinema',frosted:{floating:true,cinema:false},cinemaVideoFrosted:true})
  const first=parse(null);first.frosted.floating=false;assert.equal(parse(null).frosted.floating,true)
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

test('cinema video frost migrates older preferences without changing cover frost',()=>{
  const old=parse('{"presentation":"cinema","frosted":{"floating":false,"cinema":false}}')
  assert.equal(old.cinemaVideoFrosted,true)
  assert.deepEqual(old.frosted,{floating:false,cinema:false})
  assert.equal(parse('{"cinemaVideoFrosted":"false"}').cinemaVideoFrosted,true)
  assert.equal(parse('{"cinemaVideoFrosted":false}').cinemaVideoFrosted,false)
})
