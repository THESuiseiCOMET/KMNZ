import type { Member } from '../data/members'

interface MemberDetailProps { member: Member; onBack: () => void }
export default function MemberDetail({ member, onBack }: MemberDetailProps) {
  return (
    <article className="member-detail">
      <div className="member-avatar">
        <div className="member-photo member-photo-large"><img src={member.photo} alt={member.name} /></div>
        <div className="member-name">{member.name}</div>
      </div>
      <div className="member-info">
        <p>{member.introduction}</p>
        {member.former && <p className="help">历史成员 · 已毕业</p>}
        <div className="member-actions">
          <button type="button" className="link-btn" onClick={onBack}>← 返回成员列表</button>
        </div>
      </div>
    </article>
  )
}
