export interface BankAccount {
  id: number;
  user_id: number;
  name: string;
  type: "current" | "savings" | "upi" | "cash" | "credit_card";
  account_number?: string;
  bank_name?: string;
  balance: number;
  currency: string;
  is_primary: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountTransfer {
  id: number;
  user_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  note?: string;
  from_account_name?: string;
  from_bank?: string;
  to_account_name?: string;
  to_bank?: string;
  created_at: string;
}
