import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTypeScript} from './load-typescript.mjs'
const {parsePlaybackPreferences:parse,readPlaybackPreferences:read,playbackPreferencesKey}=await loadTypeScript(new URL('../src/lib/playbackPreferences.ts',import.meta.url))
test('missing or corrupt preferences enable both backgrounds without a player mode',()=>{for(const raw of [null,'bad json','null','[]','42'])assert.deepEqual(parse(raw),{videoFrosted:true,coverFrosted:true})})
test('old player modes migrate only their background preferences and never resurrect a floating player',()=>{
 for(const presentation of ['floating','cinema','unknown'])assert.deepEqual(parse(JSON.stringify({presentation,cinemaVideoFrosted:false,floatingBackgroundFrosted:false})),{videoFrosted:false,coverFrosted:false})
 assert.deepEqual(parse('{"presentation":"floating","frosted":{"floating":false}}'),{videoFrosted:true,coverFrosted:false})
 assert.deepEqual(parse('{"videoFrosted":false,"coverFrosted":true,"cinemaVideoFrosted":true,"floatingBackgroundFrosted":false}'),{videoFrosted:false,coverFrosted:true})
 assert(!Object.hasOwn(parse('{"presentation":"floating"}'),'presentation'))
})
test('new background preferences survive serialization and reject non-boolean values',()=>{const value={videoFrosted:false,coverFrosted:false};assert.deepEqual(parse(JSON.stringify(value)),value);assert.deepEqual(parse('{"videoFrosted":"false","coverFrosted":0}'),{videoFrosted:true,coverFrosted:true})})
test('blocked storage does not prevent opening and old saved settings are safely read',()=>{const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');try{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw Error('blocked')}}});assert.deepEqual(read(),parse(null));Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(key){assert.equal(key,playbackPreferencesKey);return '{"presentation":"floating","cinemaVideoFrosted":false}'}}});assert.deepEqual(read(),{videoFrosted:false,coverFrosted:true})}finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage}})
