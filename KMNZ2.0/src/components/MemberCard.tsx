import type { Member } from '../data/members'

interface MemberCardProps {
  member: Member
  onOpen: (id: number) => void
}
export default function MemberCard({ member, onOpen }: MemberCardProps) {
  return (
    <button className="member-link" type="button" onClick={() => onOpen(member.id)} aria-label={'查看 ' + member.name + ' 的资料'}>
      <span className="member-card">
        <span className="member-photo"><img src={member.photo} alt={member.name} loading="lazy" /></span>
        <span className="member-name">{member.name}</span>
      </span>
    </button>
  )
}
