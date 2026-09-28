import type { Icon } from '@tabler/icons-react';
import type { UserProfile } from '@/types/user';

export interface NavItem {
  title: string;
  url: string;
  icon?: Icon;
  badge?: number;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    badge?: number;
  }[];
}

// Re-export UserProfile for convenience
export type { UserProfile } from '@/types/user';

export interface SidebarData {
  user: UserProfile;
  navMain: NavItem[];
  navSecondary: NavItem[];
  admin: NavItem[];
}

export interface MetricCard {
  title: string;
  value: string;
  description: string;
  trend: {
    type: 'up' | 'down';
    value: string;
  };
  footer: {
    message: string;
    description: string;
  };
}
