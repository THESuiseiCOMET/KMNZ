import lita from '../assets/images/member1.webp'
import tina from '../assets/images/member2.webp'
import nero from '../assets/images/member3.webp'
import liz from '../assets/images/member4.webp'

export interface Member {
  id: number
  name: string
  photo: string
  introduction: string
  former?: boolean
}

export const members: Member[] = [
  { id: 1, name: 'LITA', photo: lita, introduction: 'Hey Yo — 我是 KMNZ LITA。最喜欢 HipHop 和辣妹风格，不太喜欢芹菜。请多指教！' },
  { id: 2, name: 'TINA', photo: tina, introduction: '初次见面，我是 KMNZ TINA。是一只超级可爱的狗狗，喜欢土豆和红薯。请多多指教。' },
  { id: 3, name: 'NERO', photo: nero, introduction: '这里是 KMNZ NERO。喜欢热巧和散步，不太喜欢香菜。请多多指教。' },
  { id: 4, name: 'LIZ', photo: liz, introduction: '我是 LIZ。喜欢 VOCALOID、甜食、画画与唱歌。请多多指教。', former: true },
]
