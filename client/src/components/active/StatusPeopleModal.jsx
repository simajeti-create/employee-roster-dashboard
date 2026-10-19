import Modal from '../common/Modal.jsx';
import { StatusPill, initials, avatarGradient, shiftWindow, shiftCode } from './CurrentlyActiveWidget.jsx';

export default function StatusPeopleModal({ title, entries, shiftsByEmployeeId, leavesByEmployeeId, onPick, onClose }) {
  return (
    <Modal title={`${title} · ${entries.length}`} onClose={onClose} width={560}>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 italic m-0">Nobody in this group right now.</p>
      ) : (
        <ul className="m-0 p-0" style={{ listStyle: 'none' }}>
          {entries.map(({ employee, status }) => {
            const shift = shiftsByEmployeeId?.get(employee.id);
            const leaveType = leavesByEmployeeId?.get(employee.id);
            const win = status === 'On Leave' || status === 'Off' ? null : shiftWindow(employee, shift);
            const code = win ? shiftCode(win.startLabel) : null;
            return (
              <li
                key={employee.id}
                role="button"
                tabIndex={0}
                className="active-list-row flex items-center gap-3"
                style={{ padding: '10px 8px', borderBottom: '1px solid #F3F1F9' }}
                onClick={() => onPick({ employee, status, shift, leaveType })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPick({ employee, status, shift, leaveType }); }}
              >
                <span className="avatar" style={{ background: avatarGradient(employee.name), width: 38, height: 38 }}>
                  {initials(employee.name)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: '#1a1a2e' }}>{employee.name}</span>
                  <span className="block text-xs text-gray-400 truncate">
                    {employee.department}{employee.project_name ? ` · ${employee.project_name}` : ''}
                  </span>
                </span>
                {win && (
                  <span className="inline-flex items-center gap-2 shrink-0">
                    <span
                      className="font-grotesk text-xs font-bold rounded-md"
                      style={{ padding: '2px 7px', background: code === 'S2' ? '#E3E8FB' : '#EEEAFD', color: code === 'S2' ? '#2F3C9E' : '#4A2FC4' }}
                    >
                      {code}
                    </span>
                    <span className="font-mono-data text-xs text-gray-500">{win.startLabel}–{win.endLabel}</span>
                  </span>
                )}
                <StatusPill status={status} leaveType={leaveType} />
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
