export enum ProposalStatus {
    DRAFT = 'DRAFT',
    SENT = 'SUBMITTED',
    ACCEPTED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export interface ProposalItem {
    id: string;
    proposalId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Proposal {
    id: string;
    proposalNo: string;
    leadId?: string | null;
    clientName: string;
    clientEmail?: string | null;
    clientPhone?: string | null;
    status: ProposalStatus;
    totalAmount: number;
    createdById?: string | null;
    createdByUser?: string | null;
    items: ProposalItem[];
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
}

export interface CreateProposalInput {
    leadId?: string;
    clientName: string; // Required if no leadId, or overriding
    clientEmail?: string;
    clientPhone?: string;
    createdByUser?: string;
    items?: {
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
}

export interface UpdateProposalInput {
    status?: ProposalStatus;
    leadId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
}
