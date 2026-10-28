import MemberCard from '../components/MemberCard'
import { members } from '../data/members'

interface MembersProps { onOpenMember: (id: number) => void }
export default function Members({ onOpenMember }: MembersProps) {
  return (
    <>
      <section className="members-hero">
      </section>
      <section className="members-grid" aria-label="KMNZ 成员列表">
        {members.map((member) => <MemberCard key={member.id} member={member} onOpen={onOpenMember} />)}
      </section>
    </>
  )
}
