'use server';

import prisma from '@/lib/prisma';
import { actionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ProposalStatus, Proposal, ProposalItem } from '@/types/proposal';
import { getCurrentUser } from '../admission-actions';

// Schemas
const proposalItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
});

const createProposalSchema = z.object({
  title: z.string().optional(),
  clientName: z.string().min(1, 'Client Name is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional().or(z.literal('')),
  clientAddress: z.string().optional().or(z.literal('')),
  branch: z.string().optional().or(z.literal('')),
  branchId: z.string().optional().or(z.literal('')),
  enquiryId: z.string().optional().or(z.literal('')),
  status: z.nativeEnum(ProposalStatus).default(ProposalStatus.DRAFT),
  validUntil: z.string().optional().or(z.literal('')),
  taxRate: z.number().default(0),
  discountAmount: z.number().default(0),
  notes: z.string().optional().or(z.literal('')),
  terms: z.string().optional().or(z.literal('')),
  items: z.array(proposalItemSchema).min(1, 'At least one item is required'),
});

const updateProposalSchema = z.object({
  id: z.string().min(1, 'Proposal ID is required'),
  title: z.string().optional(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional().or(z.literal('')),
  clientAddress: z.string().optional().or(z.literal('')),
  branch: z.string().optional().or(z.literal('')),
  branchId: z.string().optional().or(z.literal('')),
  enquiryId: z.string().optional().or(z.literal('')),
  status: z.nativeEnum(ProposalStatus).optional(),
  validUntil: z.string().optional().or(z.literal('')),
  taxRate: z.number().optional(),
  discountAmount: z.number().optional(),
  notes: z.string().optional().or(z.literal('')),
  terms: z.string().optional().or(z.literal('')),
  items: z.array(proposalItemSchema).optional(),
});

// Helper to generate professional proposal numbers: PROP-2026-0001
async function generateProposalNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PROP-${currentYear}-`;

  try {
    const rawResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM "proposal" 
      WHERE "proposalNo" LIKE ${prefix + '%'}
    `;
    const count = Number(rawResult[0]?.count || 0) + 1;
    return `${prefix}${count.toString().padStart(4, '0')}`;
  } catch (err) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSuffix}`;
  }
}

// ----------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------

export const getProposals = actionClient.action(async () => {
  try {
    let currentUser: any = null;
    try {
      currentUser = await getCurrentUser();
    } catch {
      // User might be public/unauth in some contexts
    }

    const role = currentUser?.role;
    const branch = currentUser?.branch;

    // Use Prisma ORM delegate if compiled, or direct parameterized query
    let proposals: any[] = [];

    if ((prisma as any).proposal) {
      const whereClause: any = {};
      if (role && role !== 'admin' && branch) {
        whereClause.OR = [{ branch: branch }, { branchId: branch }];
      }

      proposals = await (prisma as any).proposal.findMany({
        where: whereClause,
        include: {
          items: true,
          enquiry: {
            select: {
              id: true,
              candidateName: true,
              phone: true,
              email: true,
              preferredCourse: {
                select: { id: true, name: true, courseFee: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      let rawProposals: any[];
      if (role && role !== 'admin' && branch) {
        rawProposals = await prisma.$queryRaw<any[]>`
          SELECT * FROM "proposal"
          WHERE "branch" = ${branch} OR "branchId" = ${branch}
          ORDER BY "createdAt" DESC
        `;
      } else {
        rawProposals = await prisma.$queryRaw<any[]>`
          SELECT * FROM "proposal"
          ORDER BY "createdAt" DESC
        `;
      }

      // Fetch items for each proposal
      const proposalIds = rawProposals.map((p) => p.id);
      let items: any[] = [];
      if (proposalIds.length > 0) {
        items = await prisma.$queryRaw<any[]>`
          SELECT * FROM "proposal_item"
          WHERE "proposalId" = ANY(${proposalIds})
          ORDER BY "createdAt" ASC
        `;
      }

      proposals = rawProposals.map((p) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
        validUntil: p.validUntil ? new Date(p.validUntil).toISOString() : null,
        items: items
          .filter((item) => item.proposalId === p.id)
          .map((item) => ({
            ...item,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            total: Number(item.total || 0),
          })),
      }));
    }

    return { success: true, data: proposals };
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch proposals',
      data: [],
    };
  }
});

export const getProposalById = actionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id } }) => {
    try {
      let proposal: any = null;

      if ((prisma as any).proposal) {
        proposal = await (prisma as any).proposal.findUnique({
          where: { id },
          include: {
            items: true,
            enquiry: {
              select: {
                id: true,
                candidateName: true,
                phone: true,
                email: true,
                preferredCourse: {
                  select: { id: true, name: true, courseFee: true },
                },
              },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });
      } else {
        const rawList = await prisma.$queryRaw<any[]>`
          SELECT * FROM "proposal" WHERE "id" = ${id} LIMIT 1
        `;
        if (rawList && rawList.length > 0) {
          proposal = rawList[0];
          const items = await prisma.$queryRaw<any[]>`
            SELECT * FROM "proposal_item" WHERE "proposalId" = ${id} ORDER BY "createdAt" ASC
          `;
          proposal.items = items.map((item) => ({
            ...item,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            total: Number(item.total || 0),
          }));
          proposal.createdAt = proposal.createdAt
            ? new Date(proposal.createdAt).toISOString()
            : new Date().toISOString();
          proposal.updatedAt = proposal.updatedAt
            ? new Date(proposal.updatedAt).toISOString()
            : new Date().toISOString();
          proposal.validUntil = proposal.validUntil
            ? new Date(proposal.validUntil).toISOString()
            : null;
        }
      }

      if (!proposal) {
        return { success: false, message: 'Proposal not found' };
      }

      return { success: true, data: proposal };
    } catch (error) {
      console.error('Error fetching proposal by ID:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch proposal',
      };
    }
  });

export const createProposal = actionClient
  .inputSchema(createProposalSchema)
  .action(async ({ parsedInput }) => {
    try {
      let currentUser: any = null;
      try {
        currentUser = await getCurrentUser();
      } catch {
        // Fallback for unauthenticated or system context
      }

      const proposalNo = await generateProposalNumber();

      // Resolve branch: prioritize passed branch, then currentUser branch, then fallback
      const effectiveBranch =
        parsedInput.branch && parsedInput.branch.trim() !== ''
          ? parsedInput.branch.trim()
          : currentUser?.branch || 'Main Branch';

      const effectiveBranchId =
        parsedInput.branchId && parsedInput.branchId.trim() !== ''
          ? parsedInput.branchId.trim()
          : effectiveBranch;

      // Calculate items and totals
      const processedItems = parsedInput.items.map((item) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unitPrice) || 0;
        return {
          description: item.description.trim(),
          quantity: qty,
          unitPrice: price,
          total: qty * price,
        };
      });

      const subtotal = processedItems.reduce((acc, curr) => acc + curr.total, 0);
      const taxRate = Number(parsedInput.taxRate) || 0;
      const taxAmount = (subtotal * taxRate) / 100;
      const discountAmount = Number(parsedInput.discountAmount) || 0;
      const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

      const validUntilDate = parsedInput.validUntil
        ? new Date(parsedInput.validUntil)
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days default validity

      const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      let savedProposal: any = null;

      if ((prisma as any).proposal) {
        savedProposal = await (prisma as any).proposal.create({
          data: {
            id: proposalId,
            proposalNo,
            title: parsedInput.title || `Quotation for ${parsedInput.clientName}`,
            clientName: parsedInput.clientName.trim(),
            clientEmail: parsedInput.clientEmail?.trim() || null,
            clientPhone: parsedInput.clientPhone?.trim() || null,
            clientAddress: parsedInput.clientAddress?.trim() || null,
            branch: effectiveBranch,
            branchId: effectiveBranchId,
            enquiryId: parsedInput.enquiryId?.trim() || null,
            status: parsedInput.status || ProposalStatus.DRAFT,
            validUntil: validUntilDate,
            subtotal,
            taxRate,
            taxAmount,
            discountAmount,
            totalAmount,
            notes: parsedInput.notes || null,
            terms:
              parsedInput.terms ||
              '1. Proposal is valid for 15 days from issue date.\n2. Payment: 50% advance, 50% upon delivery/completion.\n3. Net metering and solar grid synchronization subject to KSEB approval.',
            createdById: currentUser?.id || null,
            createdByUser: currentUser?.name || 'CRM Team',
            items: {
              create: processedItems.map((item) => ({
                id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
            },
          },
          include: {
            items: true,
          },
        });
      } else {
        // Direct SQL transaction fallback
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`
            INSERT INTO "proposal" (
              "id", "proposalNo", "title", "enquiryId", "clientName", "clientEmail", "clientPhone", 
              "clientAddress", "branch", "branchId", "status", "validUntil", "subtotal", "taxRate", 
              "taxAmount", "discountAmount", "totalAmount", "notes", "terms", "createdById", 
              "createdByUser", "createdAt", "updatedAt"
            ) VALUES (
              ${proposalId}, ${proposalNo}, ${parsedInput.title || `Quotation for ${parsedInput.clientName}`}, 
              ${parsedInput.enquiryId?.trim() || null}, ${parsedInput.clientName.trim()}, 
              ${parsedInput.clientEmail?.trim() || null}, ${parsedInput.clientPhone?.trim() || null}, 
              ${parsedInput.clientAddress?.trim() || null}, ${effectiveBranch}, ${effectiveBranchId}, 
              ${parsedInput.status || 'DRAFT'}, ${validUntilDate}, ${subtotal}, ${taxRate}, 
              ${taxAmount}, ${discountAmount}, ${totalAmount}, ${parsedInput.notes || null}, 
              ${
                parsedInput.terms ||
                '1. Proposal is valid for 15 days from issue date.\n2. Payment: 50% advance, 50% upon delivery/completion.\n3. Net metering subject to KSEB approval.'
              }, 
              ${currentUser?.id || null}, ${currentUser?.name || 'CRM Team'}, NOW(), NOW()
            )
          `;

          for (const item of processedItems) {
            const itemId = `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            await tx.$executeRaw`
              INSERT INTO "proposal_item" (
                "id", "proposalId", "description", "quantity", "unitPrice", "total", "createdAt", "updatedAt"
              ) VALUES (
                ${itemId}, ${proposalId}, ${item.description}, ${item.quantity}, ${item.unitPrice}, ${item.total}, NOW(), NOW()
              )
            `;
          }
        }, { maxWait: 15000, timeout: 30000 });

        savedProposal = {
          id: proposalId,
          proposalNo,
          clientName: parsedInput.clientName,
          clientEmail: parsedInput.clientEmail,
          clientPhone: parsedInput.clientPhone,
          branch: effectiveBranch,
          status: parsedInput.status || 'DRAFT',
          totalAmount,
          subtotal,
          items: processedItems,
        };
      }

      // If created from an enquiry, optionally update enquiry lastContactDate
      if (parsedInput.enquiryId) {
        try {
          await prisma.enquiry.update({
            where: { id: parsedInput.enquiryId },
            data: {
              lastContactDate: new Date(),
              notes: {
                set: `Proposal #${proposalNo} (Amount: ₹${totalAmount.toLocaleString('en-IN')}) created.`,
              },
            },
          });
        } catch (e) {
          console.warn('Could not update enquiry contact date:', e);
        }
      }

      revalidatePath('/proposals');
      revalidatePath('/invoices');
      revalidatePath('/invoices/new');

      return {
        success: true,
        data: savedProposal,
        message: `Proposal ${proposalNo} created successfully!`,
      };
    } catch (error) {
      console.error('Error creating proposal:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create proposal',
      };
    }
  });

export const updateProposal = actionClient
  .inputSchema(updateProposalSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { id, items, ...updateFields } = parsedInput;

      // Check existence
      let existing: any = null;
      if ((prisma as any).proposal) {
        existing = await (prisma as any).proposal.findUnique({
          where: { id },
          include: { items: true },
        });
      } else {
        const raw = await prisma.$queryRaw<any[]>`
          SELECT * FROM "proposal" WHERE "id" = ${id} LIMIT 1
        `;
        if (raw && raw.length > 0) existing = raw[0];
      }

      if (!existing) {
        return { success: false, message: 'Proposal not found' };
      }

      let subtotal = existing.subtotal || 0;
      let totalAmount = existing.totalAmount || 0;
      let taxRate = updateFields.taxRate !== undefined ? updateFields.taxRate : existing.taxRate || 0;
      let discountAmount =
        updateFields.discountAmount !== undefined
          ? updateFields.discountAmount
          : existing.discountAmount || 0;

      // If items are provided, recalculate totals
      let processedItems: any[] | null = null;
      if (items && items.length > 0) {
        processedItems = items.map((item) => {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.unitPrice) || 0;
          return {
            id: item.id || `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            description: item.description.trim(),
            quantity: qty,
            unitPrice: price,
            total: qty * price,
          };
        });
        subtotal = processedItems.reduce((acc, curr) => acc + curr.total, 0);
        const taxAmount = (subtotal * taxRate) / 100;
        totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
      }

      if ((prisma as any).proposal) {
        await prisma.$transaction(async (tx) => {
          if (processedItems) {
            // Delete existing items and recreate
            await (tx as any).proposalItem.deleteMany({
              where: { proposalId: id },
            });
            await (tx as any).proposalItem.createMany({
              data: processedItems.map((item) => ({
                id: item.id,
                proposalId: id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
            });
          }

          await (tx as any).proposal.update({
            where: { id },
            data: {
              ...updateFields,
              ...(processedItems ? { subtotal, totalAmount } : {}),
              updatedAt: new Date(),
            },
          });
        }, { maxWait: 15000, timeout: 30000 });
      } else {
        await prisma.$transaction(async (tx) => {
          if (processedItems) {
            await tx.$executeRaw`DELETE FROM "proposal_item" WHERE "proposalId" = ${id}`;
            for (const item of processedItems) {
              await tx.$executeRaw`
                INSERT INTO "proposal_item" (
                  "id", "proposalId", "description", "quantity", "unitPrice", "total", "createdAt", "updatedAt"
                ) VALUES (
                  ${item.id}, ${id}, ${item.description}, ${item.quantity}, ${item.unitPrice}, ${item.total}, NOW(), NOW()
                )
              `;
            }
          }

          await tx.$executeRaw`
            UPDATE "proposal"
            SET 
              "clientName" = COALESCE(${updateFields.clientName || null}, "clientName"),
              "clientEmail" = COALESCE(${updateFields.clientEmail || null}, "clientEmail"),
              "clientPhone" = COALESCE(${updateFields.clientPhone || null}, "clientPhone"),
              "status" = COALESCE(${updateFields.status || null}, "status"),
              "subtotal" = ${subtotal},
              "totalAmount" = ${totalAmount},
              "updatedAt" = NOW()
            WHERE "id" = ${id}
          `;
        }, { maxWait: 15000, timeout: 30000 });
      }

      revalidatePath('/proposals');
      revalidatePath(`/proposals/${id}`);
      revalidatePath(`/proposals/${id}/edit`);

      return { success: true, message: 'Proposal updated successfully' };
    } catch (error) {
      console.error('Error updating proposal:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update proposal',
      };
    }
  });

export const deleteProposal = actionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id } }) => {
    try {
      if ((prisma as any).proposal) {
        await (prisma as any).proposal.delete({
          where: { id },
        });
      } else {
        await prisma.$executeRaw`DELETE FROM "proposal" WHERE "id" = ${id}`;
      }

      revalidatePath('/proposals');
      return { success: true, message: 'Proposal deleted successfully' };
    } catch (error) {
      console.error('Error deleting proposal:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete proposal',
      };
    }
  });
