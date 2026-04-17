import { v4 as uuidv4 } from 'uuid'
import { UpiPayoutInput } from '../middleware/schemas'
import { addTransaction, Transaction } from '../db/store'

const KNOWN_VPAS = [
  'rajelectricals@hdfc', 'amitdesign@okicici', 'kumarstores@paytm',
  'techsol@ybl', 'vendor@axis', 'supplier@sbi', 'nexo.business@axis'
]

function simulateNetworkDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function processUpiPayout(input: UpiPayoutInput): Promise<Transaction> {
  // Simulate real API call latency (300–900ms)
  const startTime = Date.now()
  await simulateNetworkDelay(Math.floor(Math.random() * 600 + 300))
  const durationMs = Date.now() - startTime

  // Simulate NPCI VPA validation
  const vpaExists = KNOWN_VPAS.includes(input.payeeVpa) ||
    /^[a-zA-Z0-9._-]+@(hdfc|sbi|axis|icici|okicici|ybl|paytm|upi)$/.test(input.payeeVpa)

  if (!vpaExists) {
    const txn = addTransaction({
      type: 'UPI', status: 'FAILED', amount: input.amount,
      recipientName: input.recipientName,
      recipientId: input.payeeVpa,
      payerVpa: input.payerVpa, payeeVpa: input.payeeVpa,
      reference: '',
      description: input.description || 'UPI payout',
      durationMs,
      errorCode: 'UPI_VPA_INVALID',
      errorMessage: `VPA '${input.payeeVpa}' is not registered on NPCI`,
    })
    return txn
  }

  // 5% random failure to simulate real-world conditions
  const randomFail = Math.random() < 0.05
  if (randomFail) {
    const txn = addTransaction({
      type: 'UPI', status: 'FAILED', amount: input.amount,
      recipientName: input.recipientName,
      recipientId: input.payeeVpa,
      payerVpa: input.payerVpa, payeeVpa: input.payeeVpa,
      reference: '',
      description: input.description || 'UPI payout',
      durationMs,
      errorCode: 'UPI_BANK_DECLINE',
      errorMessage: 'Transaction declined by issuing bank',
    })
    return txn
  }

  const txnId = 'UPI' + Date.now().toString() + Math.floor(Math.random() * 1000)
  const txn = addTransaction({
    type: 'UPI', status: 'SUCCESS', amount: input.amount,
    recipientName: input.recipientName,
    recipientId: input.payeeVpa,
    payerVpa: input.payerVpa, payeeVpa: input.payeeVpa,
    reference: txnId,
    description: input.description || 'UPI payout',
    durationMs,
  })
  return txn
}
