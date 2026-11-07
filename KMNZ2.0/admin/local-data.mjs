import { readFile,writeFile,rename } from 'node:fs/promises'
import { resolve,relative,isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'

export async function replaceLibraryFiles(root, paths, expected, target, { allowPartial = false, write = atomicText } = {}) {
  if (paths.length !== expected.length || paths.length !== target.length) throw Error('本地备份不完整。')
  const files = paths.map(path => {
    const file = resolve(root, path), rel = relative(resolve(root), file)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw Error('本地数据路径无效。')
    return file
  })
  const before = await Promise.all(files.map(file => readFile(file,'utf8')))
  if (before.some((value,i) => value !== expected[i] && !(allowPartial && value === target[i]))) throw Error('本地文件又被其他操作修改，未覆盖；请保留备份并检查差异。')
  const written = []
  try {
    for (let i=0;i<files.length;i++) if (before[i] !== target[i]) {
      if (await readFile(files[i],'utf8') !== before[i]) throw Error('本地文件在应用期间发生变化，已停止。')
      await write(files[i],target[i]);written.push(i)
    }
    const after = await Promise.all(files.map(file=>readFile(file,'utf8')))
    if (after.some((value,i)=>value!==target[i])) throw Error('应用期间存在其他修改，请检查本地文件与备份。')
  } catch (error) {
    for (const i of written.reverse()) {
      if (await readFile(files[i],'utf8') === target[i]) await atomicText(files[i],before[i])
    }
    throw error
  }
}

async function atomicText(file, content) {
  const temp=file+'.kmnz-admin-'+randomUUID()+'.tmp'
  await writeFile(temp,content,{flag:'wx',mode:0o600})
  await rename(temp,file)
}
