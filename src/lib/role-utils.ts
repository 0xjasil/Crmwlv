// Role badge variant mapping
export function getRoleBadgeVariant(
  roleName: string
): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (roleName as string) {
    case 'admin':
      return 'destructive';
    case 'executive':
      return 'default';
    case 'telecaller':
      return 'secondary';
    default:
      return 'outline';
  }
}

// Role permission checks
export function hasPermission(userRole: string | null, requiredRole: string): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<string, number> = {
    telecaller: 1,
    executive: 2,
    admin: 3,
  };

  const userLevel = roleHierarchy[userRole as string] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

// Check if user is admin
export function isAdmin(userRole: string | null): boolean {
  return userRole === 'admin';
}

// Check if user is executive or higher
export function isExecutiveOrHigher(userRole: string | null): boolean {
  return hasPermission(userRole, 'executive');
}

// Get role display name
export function getRoleDisplayName(roleName: string): string {
  const displayNames: Record<string, string> = {
    admin: 'Administrator',
    executive: 'Executive',
    telecaller: 'Telecaller',
  };

  return displayNames[roleName] || roleName;
}
