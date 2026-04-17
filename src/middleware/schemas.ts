import { z } from 'zod'

export const UpiPayoutSchema = z.object({
  payerVpa: z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/, 'Invalid payer VPA format'),
  payeeVpa: z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/, 'Invalid payee VPA format'),
  amount: z.number().min(1, 'Minimum amount is ₹1').max(100000, 'Maximum UPI limit is ₹1,00,000'),
  currency: z.literal('INR'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  description: z.string().max(50).optional(),
  merchantTxnId: z.string().uuid('merchantTxnId must be a valid UUID'),
})

export const GstnInvoiceSchema = z.object({
  gstin: z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format'
  ),
  recipientName: z.string().min(1, 'Recipient name required'),
  invoiceNo: z.string().min(1, 'Invoice number required'),
  invoiceDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be DD/MM/YYYY'),
  supplyType: z.enum(['B2B', 'B2C', 'EXPORT']),
  amount: z.number().min(1, 'Amount must be positive'),
  description: z.string().optional(),
  eWayBillNo: z.string().optional(),
})

export const BankTransferSchema = z.object({
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
  transferMode: z.enum(['NEFT', 'IMPS', 'RTGS']),
  amount: z.number().min(1).max(500000, 'IMPS limit is ₹5,00,000'),
  recipientName: z.string().min(1, 'Recipient name required'),
  description: z.string().optional(),
})

export const BankPayoutSchema = z.object({
  account_number: z.string(),
  fund_account_id: z.string(),
  amount: z.number().min(1),
  currency: z.literal('INR'),
  mode: z.enum(['NEFT', 'IMPS', 'RTGS']),
  purpose: z.literal('payout'),
  narration: z.string().optional(),
  reference_id: z.string(),
  queue_if_low_balance: z.boolean(),
})

export type UpiPayoutInput = z.infer<typeof UpiPayoutSchema>
export type GstnInvoiceInput = z.infer<typeof GstnInvoiceSchema>
export type BankTransferInput = z.infer<typeof BankTransferSchema>
export type BankPayoutInput = z.infer<typeof BankPayoutSchema>
