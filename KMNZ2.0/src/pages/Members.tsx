import MemberCard from '../components/MemberCard'
import { members } from '../data/members'

interface MembersProps { onOpenMember: (id: number) => void }
export default function Members({ onOpenMember }: MembersProps) {
  return (
    <>
      <section className="members-hero">
        <h2>成员介绍</h2>
        <p>点击成员头像查看详细介绍。将鼠标移上去头像会略微放大。</p>
      </section>
      <section className="members-grid" aria-label="KMNZ 成员列表">
        {members.map((member) => <MemberCard key={member.id} member={member} onOpen={onOpenMember} />)}
      </section>
    </>
  )
}
