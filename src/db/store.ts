import { v4 as uuidv4 } from 'uuid'

export type TxnStatus = 'SUCCESS' | 'PENDING' | 'FAILED'
export type ApiType = 'UPI' | 'GSTN' | 'BANK'
export type BankMode = 'NEFT' | 'IMPS' | 'RTGS'

export interface Transaction {
  id: string
  traceId: string
  type: ApiType
  createdAt: string
  status: TxnStatus
  amount: number
  recipientName: string
  recipientId: string      // VPA / GSTIN / Account no
  reference: string        // UTR / IRN / txnId
  description: string
  durationMs: number
  errorCode?: string
  errorMessage?: string
  // UPI specific
  payerVpa?: string
  payeeVpa?: string
  // GSTN specific
  gstin?: string
  invoiceNo?: string
  invoiceType?: string
  irnNumber?: string
  itcEligible?: boolean
  // Bank specific
  bankMode?: BankMode
  ifsc?: string
  accountNumber?: string
}

export interface AuditLog {
  id: string
  traceId: string
  timestamp: string
  api: ApiType
  endpoint: string
  actorId: string
  statusCode: number
  durationMs: number
  errorCode?: string
  requestHash: string
}

function randomMs(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min)
}

function pastTime(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60000).toISOString()
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0
  return 'sha256-' + Math.abs(h).toString(16).padStart(8, '0')
}

export const transactions: Transaction[] = [
  {
    id: uuidv4(), traceId: 'a7f3c1-upi-001', type: 'UPI',
    createdAt: pastTime(2), status: 'SUCCESS', amount: 12500,
    recipientName: 'Raj Electricals', recipientId: 'rajelectricals@hdfc',
    payerVpa: 'nexo.business@axis', payeeVpa: 'rajelectricals@hdfc',
    reference: 'UPI' + Date.now().toString().slice(-10),
    description: 'Vendor payment - electrical supplies',
    durationMs: randomMs(300, 900)
  },
  {
    id: uuidv4(), traceId: 'b8e2d4-gst-001', type: 'GSTN',
    createdAt: pastTime(8), status: 'SUCCESS', amount: 84000,
    recipientName: 'Acme Pvt Ltd', recipientId: '27AAPFU0939F1ZV',
    gstin: '27AAPFU0939F1ZV', invoiceNo: 'INV-2024-089',
    invoiceType: 'B2B', irnNumber: 'IRN' + Date.now().toString().slice(-12),
    itcEligible: true,
    reference: 'IRN-2024-089',
    description: 'B2B invoice - consulting services Q1',
    durationMs: randomMs(400, 1200)
  },
  {
    id: uuidv4(), traceId: 'c9f1e5-bank-001', type: 'BANK',
    createdAt: pastTime(12), status: 'SUCCESS', amount: 55000,
    recipientName: 'Priya Sharma', recipientId: '****4821',
    bankMode: 'NEFT', ifsc: 'SBIN0007894', accountNumber: '****4821',
    reference: 'NEFT' + Date.now().toString().slice(-10),
    description: 'Monthly salary - March 2024',
    durationMs: randomMs(500, 1500)
  },
  {
    id: uuidv4(), traceId: 'd0g2f6-upi-002', type: 'UPI',
    createdAt: pastTime(18), status: 'PENDING', amount: 8000,
    recipientName: 'Amit Design Studio', recipientId: 'amitdesign@okicici',
    payerVpa: 'nexo.business@axis', payeeVpa: 'amitdesign@okicici',
    reference: 'UPI' + (Date.now() - 1000).toString().slice(-10),
    description: 'Freelancer payment - logo design',
    durationMs: randomMs(200, 600)
  },
  {
    id: uuidv4(), traceId: 'e1h3g7-bank-002', type: 'BANK',
    createdAt: pastTime(25), status: 'FAILED', amount: 31200,
    recipientName: 'Sharma Traders', recipientId: '****9012',
    bankMode: 'IMPS', ifsc: 'HDFC0001234', accountNumber: '****9012',
    reference: '', errorCode: 'BANK_IFSC_STALE',
    errorMessage: 'IFSC HDFC0001234 belongs to merged branch',
    description: 'Vendor payment - raw materials',
    durationMs: randomMs(100, 400)
  },
  {
    id: uuidv4(), traceId: 'f2i4h8-gst-002', type: 'GSTN',
    createdAt: pastTime(35), status: 'FAILED', amount: 120000,
    recipientName: 'Beta Corp', recipientId: '06BZAHM9999P6Z2',
    gstin: '06BZAHM9999P6Z2', invoiceNo: 'INV-2024-085',
    invoiceType: 'B2B', itcEligible: false,
    reference: '', errorCode: 'GSTN_MISMATCH',
    errorMessage: 'GSTIN not found in GSTR-2B for period Mar-24',
    description: 'B2B invoice - software license',
    durationMs: randomMs(600, 1400)
  },
  {
    id: uuidv4(), traceId: 'g3j5i9-upi-003', type: 'UPI',
    createdAt: pastTime(42), status: 'SUCCESS', amount: 3200,
    recipientName: 'Kumar Stores', recipientId: 'kumarstores@paytm',
    payerVpa: 'nexo.business@axis', payeeVpa: 'kumarstores@paytm',
    reference: 'UPI' + (Date.now() - 2000).toString().slice(-10),
    description: 'Office supplies purchase',
    durationMs: randomMs(300, 800)
  },
  {
    id: uuidv4(), traceId: 'h4k6j0-bank-003', type: 'BANK',
    createdAt: pastTime(55), status: 'SUCCESS', amount: 72000,
    recipientName: 'Rahul Mehta', recipientId: '****9203',
    bankMode: 'NEFT', ifsc: 'UTIB0001234', accountNumber: '****9203',
    reference: 'NEFT' + (Date.now() - 3000).toString().slice(-10),
    description: 'Monthly salary - March 2024',
    durationMs: randomMs(400, 1200)
  },
  {
    id: uuidv4(), traceId: 'i5l7k1-gst-003', type: 'GSTN',
    createdAt: pastTime(68), status: 'SUCCESS', amount: 210000,
    recipientName: 'Zeta Traders', recipientId: '06BZAHM6385P6Z2',
    gstin: '06BZAHM6385P6Z2', invoiceNo: 'INV-2024-081',
    invoiceType: 'B2B', irnNumber: 'IRN' + (Date.now() - 5000).toString().slice(-12),
    itcEligible: true,
    reference: 'IRN-2024-081',
    description: 'B2B invoice - machinery parts',
    durationMs: randomMs(500, 1300)
  },
  {
    id: uuidv4(), traceId: 'j6m8l2-upi-004', type: 'UPI',
    createdAt: pastTime(90), status: 'SUCCESS', amount: 25000,
    recipientName: 'Tech Solutions', recipientId: 'techsol@ybl',
    payerVpa: 'nexo.business@axis', payeeVpa: 'techsol@ybl',
    reference: 'UPI' + (Date.now() - 4000).toString().slice(-10),
    description: 'IT support - monthly retainer',
    durationMs: randomMs(250, 700)
  },
]

export const auditLogs: AuditLog[] = transactions.map(t => ({
  id: uuidv4(),
  traceId: t.traceId,
  timestamp: t.createdAt,
  api: t.type,
  endpoint: t.type === 'UPI' ? '/api/upi/payout'
    : t.type === 'GSTN' ? '/api/gstn/invoice'
    : '/api/bank/transfer',
  actorId: 'merchant_nexo_001',
  statusCode: t.status === 'SUCCESS' ? (t.type === 'GSTN' ? 201 : 200)
    : t.status === 'FAILED' ? 422 : 202,
  durationMs: t.durationMs,
  errorCode: t.errorCode,
  requestHash: hash(t.traceId + t.amount + t.createdAt),
}))

export function addTransaction(txn: Omit<Transaction, 'id' | 'traceId' | 'createdAt'>): Transaction {
  const newTxn: Transaction = {
    ...txn,
    id: uuidv4(),
    traceId: uuidv4().slice(0, 8) + '-' + txn.type.toLowerCase(),
    createdAt: new Date().toISOString(),
  }
  transactions.unshift(newTxn)
  auditLogs.unshift({
    id: uuidv4(),
    traceId: newTxn.traceId,
    timestamp: newTxn.createdAt,
    api: newTxn.type,
    endpoint: newTxn.type === 'UPI' ? '/api/upi/payout'
      : newTxn.type === 'GSTN' ? '/api/gstn/invoice'
      : '/api/bank/transfer',
    actorId: 'merchant_nexo_001',
    statusCode: newTxn.status === 'SUCCESS' ? (newTxn.type === 'GSTN' ? 201 : 200)
      : newTxn.status === 'FAILED' ? 422 : 202,
    durationMs: newTxn.durationMs,
    errorCode: newTxn.errorCode,
    requestHash: hash(newTxn.traceId + newTxn.amount + newTxn.createdAt),
  })
  return newTxn
}
