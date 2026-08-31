import { DOCTOR_PANEL_ROLES, type Role } from '@piel360/shared';
import { Roles } from './roles.decorator';

/** Roles con acceso al panel clínico (`doctor` | `empresa`). */
export const ClinicalPanelRoles = () =>
  Roles(...(DOCTOR_PANEL_ROLES as readonly Role[]));

/** Panel clínico o superadmin (p. ej. mapas de organización). */
export const ClinicalPanelOrSuperadminRoles = () =>
  Roles(...([...DOCTOR_PANEL_ROLES, 'superadmin'] as const));
