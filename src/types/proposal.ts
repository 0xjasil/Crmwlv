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
    createdAt?: string;
    updatedAt?: string;
}

export interface Proposal {
    id: string;
    proposalNo: string;
    title?: string | null;
    leadId?: string | null;
    enquiryId?: string | null;
    clientName: string;
    clientEmail?: string | null;
    clientPhone?: string | null;
    clientAddress?: string | null;
    branch?: string | null;
    branchId?: string | null;
    status: ProposalStatus;
    validUntil?: string | null;
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    notes?: string | null;
    terms?: string | null;
    createdById?: string | null;
    createdByUser?: string | null;
    items: ProposalItem[];
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
    enquiry?: {
        id: string;
        candidateName: string;
        phone: string;
        email?: string | null;
        preferredCourse?: {
            id: string;
            name: string;
            courseFee?: number | null;
        } | null;
    } | null;
}

export interface CreateProposalInput {
    title?: string;
    leadId?: string;
    enquiryId?: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    branch?: string;
    branchId?: string;
    status?: ProposalStatus;
    validUntil?: string;
    taxRate?: number;
    discountAmount?: number;
    notes?: string;
    terms?: string;
    createdByUser?: string;
    items?: {
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
}

export interface UpdateProposalInput {
    id: string;
    title?: string;
    status?: ProposalStatus;
    leadId?: string;
    enquiryId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    branch?: string;
    branchId?: string;
    validUntil?: string;
    taxRate?: number;
    discountAmount?: number;
    notes?: string;
    terms?: string;
    items?: {
        id?: string;
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
}
