'use server';

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ProposalStatus } from '@/types/proposal';
import jwt from 'jsonwebtoken';
import { getCurrentUser } from '../admission-actions';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL;
// Use the secret provided by the user. In a real app, this should be in .env
const JWT_SECRET = process.env.JWT_SECRET;

const generateAuthToken = () => {
    try {
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const token = jwt.sign({}, JWT_SECRET);
        return token;
    } catch (error) {
        console.error("Error signing token:", error);
        throw new Error("Failed to generate auth token");
    }
};

const action = createSafeActionClient();

// Schemas
const proposalItemSchema = z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
});

const createProposalSchema = z.object({
    clientName: z.string(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    branch:z.string(),
    items: z.array(proposalItemSchema).optional(),
});

const updateProposalSchema = z.object({
    id: z.string(),
    clientName: z.string().optional(),
    clientEmail: z.string().optional(),
    clientPhone: z.string().optional(),
    status: z.nativeEnum(ProposalStatus).optional(),
    items: z.array(proposalItemSchema).optional(),
});

// Helper function for making authenticated requests
async function fetchExternal(endpoint: string, options: RequestInit = {}) {
    const token = generateAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`External API Error (${response.status} ${response.statusText}):`, errorBody);
        console.log(errorBody,"error body")
        throw new Error(`External API Error: ${response.statusText}`);
    }

    // Some endpoints might return 204 No Content or just status
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return response.json();
    }
    return null;
}

// ----------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------

export const getProposals = action.action(async () => {
    try {
        const data = await fetchExternal('/proposals');
        const user = await getCurrentUser();
        const branchId = user?.branch;
        const role = user?.role;
        const filteredData = data.filter((proposal: any) => proposal.branchId === branchId);
        const responseDate = role === 'admin' ? data : filteredData;
        return { success: true, data:responseDate };
    } catch (error) {
        console.log("error from get proposals",error)
        return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch proposals' };
    }
});

export const getProposalById = action.schema(z.object({ id: z.string() })).action(async ({ parsedInput: { id } }) => {
    try {
        const data = await fetchExternal(`/proposals/${id}`);
        return { success: true, data };
    } catch (error) {
        console.log("error from get proposal by id",error)
        return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch proposal' };
    }
});

export const createProposal = action.schema(createProposalSchema).action(async ({ parsedInput }) => {
    try {
        
        const user = await getCurrentUser();
        console.log("data input",parsedInput)
        const payload = {
            ...parsedInput,
            createdByUser: user?.name || 'CRM System User',
        };

        const data = await fetchExternal('/proposals', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        revalidatePath('/proposals');

        return { success: true, data, message: 'Proposal created successfully' };
    } catch (error) {
        console.log("error from create proposal",error)
        return { success: false, message: error instanceof Error ? error.message : 'Failed to create proposal' };
    }
});

export const updateProposal = action.schema(updateProposalSchema).action(async ({ parsedInput }) => {
    try {
        const { id, items, ...updateData } = parsedInput;

        // 1. Update basic details
        if (Object.keys(updateData).length > 0) {
            await fetchExternal(`/proposals/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
        }

        // 2. Sync Items if provided
        if (items) {
            // Fetch current state to compare
            const currentProposal = await fetchExternal(`/proposals/${id}`);
            const currentItems: any[] = currentProposal.items || [];
          
            for (const item of currentItems) {
                await fetchExternal(`/proposals/items/${item.id}`, { method: 'DELETE' });
            }

            for (const item of items) {
                await fetchExternal(`/proposals/${id}/items`, {
                    method: 'POST',
                    body: JSON.stringify(item)
                });
            }
        }

        revalidatePath('/proposals');
        revalidatePath(`/proposals/${id}`);
        return { success: true, message: 'Proposal updated successfully' };
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Failed to update proposal' };
    }
});

export const deleteProposal = action.schema(z.object({ id: z.string() })).action(async ({ parsedInput: { id } }) => {
    try {
        await fetchExternal(`/proposals/${id}`, {
            method: 'DELETE',
        });
        revalidatePath('/proposals');
        return { success: true, message: 'Proposal deleted successfully' };
    } catch (error) {
        console.log("error from delete proposal",error)
        return { success: false, message: error instanceof Error ? error.message : 'Failed to delete proposal' };
    }
});
