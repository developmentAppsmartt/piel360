export function isEnterpriseDoctor(doctor: {
  membershipType: string;
  empresa: boolean;
  empresaReferida: boolean;
}) {
  const type = (doctor.membershipType ?? '').trim().toLowerCase();
  return (
    type === 'empresa' ||
    type === 'empresa_aliada' ||
    doctor.empresa ||
    doctor.empresaReferida
  );
}
