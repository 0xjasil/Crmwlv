



export interface ServiceBilling {
    id: string;
    serviceIds: string[];
    total: number;
    billId: string;
    admissionId: string;
    status: "PARTIALLY_PAID" | "PAID" | "UNPAID";
    billDate: Date;
    updatedAt: Date;
    paid: number;
    balance: number;
}

export interface CreateServiceBilling {
    serviceIds: string[];
    billDate:Date
    paymentMode?: string;
    admissionId: string;
    paid?: number;
}

export interface UpdateServiceBilling {
    serviceIds?: string[];
    id: string;
}


export interface DeleteServiceBilling {
    id: string;
}


export interface ServiceBillingWithAdmission {
  id: string;
  serviceIds: string[];
  total: number;
  admissionId: string;
  paid: number;
  balance: number;
  billDate: Date;
  billId: string;
  updatedAt: Date;
  status : "PAID" | "UNPAID" | "PARTIALLY_PAID";
  admission: {
    candidateName: string;
    admissionNumber: string;
  };
  services?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}


export interface PayServiceBilling {
  id: string;
  paid: number;
  paymentMode?: string;
}

export interface ServiceBillItem {
  id: string;
  serviceBillId: string;
  amount: number;
  paymentMode: string | null;
  createdAt: Date;
  updatedAt: Date;
}