import { GstnInvoiceInput } from '../middleware/schemas'
import { addTransaction, Transaction } from '../db/store'

const VALID_GSTINS = [
  '27AAPFU0939F1ZV', '06BZAHM6385P6Z2', '29AAGCB5311D1ZF',
  '33AABCT1332L1ZR', '07AAACM0192A1ZI', '19AAHCM2716A1Z8'
]

function simulateDelay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function processGstnInvoice(input: GstnInvoiceInput): Promise<Transaction> {
  const startTime = Date.now()
  await simulateDelay(Math.floor(Math.random() * 800 + 400))
  const durationMs = Date.now() - startTime

  // Simulate GSTN portal validation
  const gstinValid = VALID_GSTINS.includes(input.gstin)

  if (!gstinValid) {
    const txn = addTransaction({
      type: 'GSTN', status: 'FAILED', amount: input.amount,
      recipientName: input.recipientName,
      recipientId: input.gstin,
      gstin: input.gstin, invoiceNo: input.invoiceNo,
      invoiceType: input.supplyType, itcEligible: false,
      reference: '',
      description: input.description || `Invoice ${input.invoiceNo}`,
      durationMs,
      errorCode: 'GSTN_MISMATCH',
      errorMessage: `GSTIN ${input.gstin} not found in GSTR-2B for current period`,
    })
    return txn
  }

  // Check eWayBill requirement
  if (input.amount > 50000 && !input.eWayBillNo) {
    const txn = addTransaction({
      type: 'GSTN', status: 'FAILED', amount: input.amount,
      recipientName: input.recipientName,
      recipientId: input.gstin,
      gstin: input.gstin, invoiceNo: input.invoiceNo,
      invoiceType: input.supplyType, itcEligible: false,
      reference: '',
      description: input.description || `Invoice ${input.invoiceNo}`,
      durationMs,
      errorCode: 'EWAY_BILL_REQUIRED',
      errorMessage: 'e-Way Bill required for invoice value above ₹50,000',
    })
    return txn
  }

  const irn = 'IRN' + Date.now().toString() + Math.floor(Math.random() * 10000)
  const txn = addTransaction({
    type: 'GSTN', status: 'SUCCESS', amount: input.amount,
    recipientName: input.recipientName,
    recipientId: input.gstin,
    gstin: input.gstin, invoiceNo: input.invoiceNo,
    invoiceType: input.supplyType,
    irnNumber: irn, itcEligible: input.supplyType === 'B2B',
    reference: irn,
    description: input.description || `Invoice ${input.invoiceNo}`,
    durationMs,
  })
  return txn
}
