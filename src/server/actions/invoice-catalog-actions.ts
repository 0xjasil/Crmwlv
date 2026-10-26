'use server';

import prisma from '@/lib/prisma';
import { getProposals } from './proposal/proposal-actions';
import { Proposal, ProposalItem } from '@/types/proposal';

export interface InvoiceProductItem {
  id: string;
  name: string;
  price: number;
  category: 'proposal' | 'package' | 'component';
  description?: string;
  quantity?: number;
  proposalId?: string;
  proposalNo?: string;
  clientName?: string;
  clientPhone?: string;
}

export interface ProposalMatch {
  id: string;
  proposalNo: string;
  clientName: string;
  clientPhone?: string;
  totalAmount: number;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export async function getInvoiceProductCatalog(customerQuery?: {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  sourceType?: string;
}): Promise<{
  success: boolean;
  catalog: InvoiceProductItem[];
  matchingProposals: ProposalMatch[];
}> {
  try {
    const catalogItems: InvoiceProductItem[] = [];
    const matchingProposals: ProposalMatch[] = [];

    // 1. Fetch proposals created for enquiries / clients
    try {
      const proposalRes = await getProposals();
      const proposals: Proposal[] =
        proposalRes?.data?.success && Array.isArray(proposalRes.data.data)
          ? proposalRes.data.data
          : Array.isArray(proposalRes?.data)
          ? (proposalRes.data as unknown as Proposal[])
          : [];

      for (const proposal of proposals) {
        // Check if this proposal matches the selected customer / enquiry
        if (customerQuery?.name || customerQuery?.phone || customerQuery?.id) {
          const nameMatch =
            customerQuery.name &&
            proposal.clientName &&
            (proposal.clientName.toLowerCase().includes(customerQuery.name.toLowerCase()) ||
              customerQuery.name.toLowerCase().includes(proposal.clientName.toLowerCase()));

          const phoneMatch =
            customerQuery.phone &&
            proposal.clientPhone &&
            (proposal.clientPhone.replace(/\D/g, '').endsWith(customerQuery.phone.replace(/\D/g, '').slice(-10)) ||
              customerQuery.phone.replace(/\D/g, '').endsWith(proposal.clientPhone.replace(/\D/g, '').slice(-10)));

          const leadMatch =
            customerQuery.id &&
            proposal.leadId &&
            customerQuery.id.includes(proposal.leadId);

          if (nameMatch || phoneMatch || leadMatch) {
            matchingProposals.push({
              id: proposal.id,
              proposalNo: proposal.proposalNo,
              clientName: proposal.clientName,
              clientPhone: proposal.clientPhone || undefined,
              totalAmount: proposal.totalAmount,
              items: (proposal.items || []).map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                total: item.total || (item.quantity || 1) * (item.unitPrice || 0),
              })),
            });
          }
        }

        // Add unique items from proposals to the catalog
        if (proposal.items && Array.isArray(proposal.items)) {
          for (const item of proposal.items) {
            if (item.description && item.description.trim()) {
              const trimmedDesc = item.description.trim();
              const alreadyExists = catalogItems.some(
                (existing) => existing.name.toLowerCase() === trimmedDesc.toLowerCase()
              );

              if (!alreadyExists) {
                catalogItems.push({
                  id: `prop-item-${item.id || Math.random().toString(36).slice(2, 9)}`,
                  name: trimmedDesc,
                  price: item.unitPrice || 0,
                  quantity: item.quantity || 1,
                  category: 'proposal',
                  description: trimmedDesc,
                  proposalId: proposal.id,
                  proposalNo: proposal.proposalNo,
                  clientName: proposal.clientName,
                });
              }
            }
          }
        }
      }
    } catch (proposalErr) {
      console.warn('Could not load external proposals:', proposalErr);
    }

    // 2. Fetch Solar System Packages & Products from Course (Required Capacities for Enquiries & Admissions)
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    for (const course of courses) {
      const brandStr = course.duration ? ` (${course.duration})` : '';
      const price = course.courseFee || 0;
      const kseb = course.admissionFee || 0;
      const grandTotal = price + kseb;

      catalogItems.push({
        id: `course-pkg-${course.id}`,
        name: `${course.name} On-Grid Solar System${brandStr}`,
        price: price > 0 ? price : grandTotal,
        category: 'package',
        description:
          course.description ||
          `${course.name} On-Grid Solar System with ${course.duration || 'Tier-1'} Panels. KSEB Fee: ₹${kseb.toLocaleString('en-IN')}. Grand Total: ₹${grandTotal.toLocaleString('en-IN')}.`,
      });
    }

    // 3. Add standard Solar System Components (Panels, Inverters, Structures, Net-metering)
    const standardSolarComponents: InvoiceProductItem[] = [
      {
        id: 'comp-solar-panels',
        name: 'Mono PERC Half-Cut Solar PV Modules (540W/550W)',
        price: 18500,
        category: 'component',
        description: 'Tier-1 Mono PERC Bifacial/Monofacial Solar Panels with 25 Years Performance Warranty',
      },
      {
        id: 'comp-solar-inverter',
        name: 'On-Grid Solar String Inverter with Wi-Fi Monitoring',
        price: 38000,
        category: 'component',
        description: 'Grid-tied solar inverter with dual MPPT, digital display, and remote monitoring app',
      },
      {
        id: 'comp-solar-structure',
        name: 'Solar Module Aluminium Mounting Structure & Fasteners',
        price: 14000,
        category: 'component',
        description: 'Anodized aluminium rooftop mounting structure engineered for wind speed up to 150 km/h',
      },
      {
        id: 'comp-ac-dc-db',
        name: 'ACDB & DCDB Distribution Box with SPD Protection',
        price: 8500,
        category: 'component',
        description: 'IP65 rated DC & AC distribution boxes with Type-II surge protection and MCB fuses',
      },
      {
        id: 'comp-kseb-metering',
        name: 'KSEB Bi-directional Net Metering & Feasibility Fee',
        price: 4500,
        category: 'component',
        description: 'KSEB application registration, site feasibility inspection, and bi-directional solar net meter testing',
      },
      {
        id: 'comp-cables-earthing',
        name: 'Solar DC/AC Solar Cables & Chemical Earthing Kit',
        price: 11500,
        category: 'component',
        description: 'UV-resistant 4/6 sq.mm solar copper cables, dual chemical earthing electrodes, and lightning arrester',
      },
    ];

    for (const comp of standardSolarComponents) {
      if (!catalogItems.some((existing) => existing.name.toLowerCase() === comp.name.toLowerCase())) {
        catalogItems.push(comp);
      }
    }

    // 4. If a specific customer/enquiry was selected, check if they have a preferred course in Enquiry
    if (customerQuery?.id) {
      try {
        const cleanId = customerQuery.id.replace(/^(enquiry|admission|customer):/, '');
        const enquiry = await prisma.enquiry.findFirst({
          where: {
            OR: [
              { id: cleanId },
              ...(customerQuery.phone ? [{ phone: customerQuery.phone }] : []),
              ...(customerQuery.name ? [{ candidateName: customerQuery.name }] : []),
            ],
          },
          include: { preferredCourse: true },
        });

        if (enquiry?.preferredCourse) {
          const pref = enquiry.preferredCourse;
          const prefItem: InvoiceProductItem = {
            id: `enquiry-pref-${pref.id}`,
            name: `Enquiry System: ${pref.name}${pref.duration ? ` (${pref.duration})` : ''}`,
            price: pref.courseFee || 0,
            category: 'package',
            description:
              pref.description ||
              `${pref.name} Solar System enquired by ${enquiry.candidateName}`,
          };
          // Put preferred course at top of catalog
          catalogItems.unshift(prefItem);
        }
      } catch (err) {
        console.warn('Could not inspect enquiry preferred course:', err);
      }
    }

    return {
      success: true,
      catalog: catalogItems,
      matchingProposals,
    };
  } catch (error) {
    console.error('Error fetching invoice product catalog:', error);
    return {
      success: false,
      catalog: [],
      matchingProposals: [],
    };
  }
}
