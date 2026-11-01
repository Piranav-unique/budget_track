/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */


/**
 * Request type for /api/categorize-expense
 */
export interface CategorizeRequest {
  description: string;
}

/**
 * Response type for /api/categorize-expense
 */
export interface CategorizeResponse {
  category: string;
  confidence?: number; // Optional: AI confidence score 0-1
  method: 'ai' | 'fallback'; // Which method was used
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  category?: string;
  date?: string;
  note?: string;
  userId?: string | number;
  chat_id?: string;
  source?: string;
}

export interface CreateExpenseResponse {
  _id?: string;
  id?: number | string;
  description: string;
  amount: number;
  category: string;
  note: string | null;
  date: string;
  createdAt?: string;
  created_at?: string;
  userId?: string | number | null;
  user_id?: string | number | null;
  chat_id?: string | null;
  source?: string | null;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  display_name?: string;
  email?: string;
  provider?: string;
}

export type InsertUser = Pick<User, 'username' | 'password' | 'display_name' | 'email' | 'provider'>;
