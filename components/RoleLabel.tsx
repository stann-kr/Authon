interface RoleLabelProps {
  role?: string | null;
  className?: string;
}

function formatRole(role?: string | null) {
  if (!role) return '-';
  return role.replace(/_/g, ' ').toUpperCase();
}

export default function RoleLabel({ role, className }: RoleLabelProps) {
  return <span className={className}>{formatRole(role)}</span>;
}
