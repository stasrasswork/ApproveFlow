import type { ClientOutsideProject } from '../api/types';
import { userDisplayName } from '../lib/format';

type ClientHandoffPickerProps = {
  clients: ClientOutsideProject[];
  selectedClientIds: string[];
  onChange: (clientUserIds: string[]) => void;
  disabled?: boolean;
};

export function ClientHandoffPicker({
  clients,
  selectedClientIds,
  onChange,
  disabled = false,
}: ClientHandoffPickerProps) {
  if (clients.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100">
        No workspace clients are available for handoff. Invite a client to the
        workspace first.
      </p>
    );
  }

  function toggleClient(userId: string) {
    if (disabled) {
      return;
    }
    if (selectedClientIds.includes(userId)) {
      onChange(selectedClientIds.filter((id) => id !== userId));
      return;
    }
    onChange([...selectedClientIds, userId]);
  }

  return (
    <fieldset className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
      <legend className="px-1 text-sm font-medium text-slate-800">
        Select clients to add to this project
      </legend>
      <p className="mt-1 text-xs text-slate-500">
        Only selected clients will receive project access and handoff notification.
      </p>
      <ul className="mt-3 space-y-2">
        {clients.map((client) => {
          const checked = selectedClientIds.includes(client.userId);
          return (
            <li key={client.userId}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/60 bg-white px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleClient(client.userId)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">
                    {userDisplayName(client)}
                  </span>
                  <span className="block break-all text-xs text-slate-500">
                    {client.email}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
