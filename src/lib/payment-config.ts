export interface BankAccount {
  name: string;
  bank: string;
  accountNumber: string;
  color: string;
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    name: "อดิศร เจียมเจิรญ",
    bank: "พร้อมเพย์",
    accountNumber: "0931304275",
    color: "#1ba345",
  },
  {
    name: "มงคล เอี่ยมสะอาด",
    bank: "พร้อมเพย์",
    accountNumber: "0984152467",
    color: "#4e2e8f",
  },
];

export interface PaymentRequest {
  token: string;
  orderId: string;
  teamName: string;
  amount: number;
  accountIndex: number;
  note: string;
  status: "pending" | "slip_uploaded" | "approved" | "rejected";
  createdAt: string;
  slipUrl: string | null;
  slipUploadedAt: string | null;
  approvedAt?: string | null;
  approvedAmount?: number | null;
}
