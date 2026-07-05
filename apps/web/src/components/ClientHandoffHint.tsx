import type { ClientOutsideProject } from '../api/types';
import { userDisplayName } from '../lib/format';

type ClientHandoffHintProps = {
  clients: ClientOutsideProject[];
};

export function ClientHandoffHint({ clients }: ClientHandoffHintProps) {
  if (clients.length === 0) {
    return null;
  }

  return (
    <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 ring-1 ring-amber-100">
      {clients.length === 1 ? (
        <>
          Client <strong>{userDisplayName(clients[0])}</strong> is not in this
          project yet. They will be added automatically when you send the task
          to the client.
        </>
      ) : (
        <>
          {clients.length} workspace clients are not in this project yet. They
          will be added automatically when you send the task to the client.
        </>
      )}
    </p>
  );
}
