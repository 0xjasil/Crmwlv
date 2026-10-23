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
  IconSun,
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
      title: 'Leads',
      url: '/enquiries',
      icon: IconUsers,
    },
    {
      title: 'Installations',
      url: '/enquiries/job-orders',
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
      title: 'Sales Follow-ups',
      url: '/follow-ups',
      icon: IconListDetails,
    },
    {
      title: 'Sales Calls',
      url: '/call-register',
      icon: IconPhoneCall,
    },
    {
      title: 'Customers',
      url: '/customers',
      icon: IconUsers,
    },
    {
      title: 'Service Jobs',
      url: '/services',
      icon: IconFileDollar,
    },
    {
      title: 'Quotes & Proposals',
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
      title: 'Solar Catalog & Setup',
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
