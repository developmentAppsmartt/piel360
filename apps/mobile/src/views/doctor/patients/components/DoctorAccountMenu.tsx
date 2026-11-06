import { LegalDocumentModal } from '../../../../components/legal/LegalDocumentModal';
import type { LegalDocId } from '../../../../data/legal/documents';
import { InviteColleagueModal } from '../../home/InviteColleagueModal';
import { AccountDrawer, type AccountMenuId } from './AccountDrawer';

type DoctorAccountMenuProps = {
  menuOpen: boolean;
  onCloseMenu: () => void;
  onSelect: (id: AccountMenuId) => void;
  inviteOpen: boolean;
  onCloseInvite: () => void;
  legalDoc: LegalDocId | null;
  onCloseLegal: () => void;
};

/** Menú de cuenta del profesional, con invitar colega y documentos legales. */
export function DoctorAccountMenu({
  menuOpen,
  onCloseMenu,
  onSelect,
  inviteOpen,
  onCloseInvite,
  legalDoc,
  onCloseLegal,
}: DoctorAccountMenuProps) {
  return (
    <>
      <AccountDrawer
        visible={menuOpen}
        onClose={onCloseMenu}
        onSelect={onSelect}
      />
      <InviteColleagueModal visible={inviteOpen} onClose={onCloseInvite} />
      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={onCloseLegal}
      />
    </>
  );
}
