import {
  IconCash,
  IconDashboard,
  IconDatabase,
  IconFileInvoice,
  IconFileText,
  IconListDetails,
  IconPhoneCall,
  IconUserPlus,
  IconUsers,
  IconFileDollar,
  IconBriefcase,
  IconSchool,
  IconChartBar
} from '@tabler/icons-react';
import type { SidebarData } from '@/types/navigation';
import { APP_CONFIG } from '@/config/app';

export const SIDEBAR_DATA: SidebarData = {
  user: {
    id: '1',
    name: 'User',
    email: 'user@elevate.com',
    image: '/avatars/default.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Enquiries',
      url: '/enquiries',
      icon: IconUsers,
    },
    {
      title: 'Job Orders',
      url: '#',
      icon: IconBriefcase,
      isActive: false,
      items: [
        {
          title: 'Pending',
          url: '/enquiries/job-orders/pending',
        },
        {
          title: 'Completed',
          url: '/enquiries/job-orders/completed',
        },
      ],
    },
    {
      title: 'Follow-ups',
      url: '/follow-ups',
      icon: IconListDetails,
    },
    {
      title: 'Call Register',
      url: '/call-register',
      icon: IconPhoneCall,
    },
    {
      title: 'Admissions',
      url: '/admissions',
      icon: IconSchool,
    },
    {
      title: 'Service Billing',
      url: '/services',
      icon: IconFileDollar,
    },
    {
      title: 'Proposals',
      url: '/proposals',
      icon: IconFileText,
    },
  ],
  admin: [
    {
      title: 'Reports',
      url: '/reports',
      icon: IconChartBar,
    },
    {
      title: 'Data Management',
      url: '/admin/data-management',
      icon: IconDatabase,
    },
    {
      title: 'Users',
      url: '/admin/users',
      icon: IconUserPlus,
    },
  ],
  navSecondary: [
    {
      title: 'Invoices',
      url: '/invoices',
      icon: IconFileInvoice,
    },
    {
      title: 'Expenses',
      url: '/expenses',
      icon: IconCash,
    },
  ],
};

export const COMPANY_INFO = {
  name: APP_CONFIG.name,
  description: APP_CONFIG.description,
} as const;
