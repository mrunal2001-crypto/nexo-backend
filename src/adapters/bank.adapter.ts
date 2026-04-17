import { v4 as uuidv4 } from 'uuid'
import { BankTransferInput } from '../middleware/schemas'
import { addTransaction, Transaction } from '../db/store'

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''
const RAZORPAY_ACCOUNT_NO = process.env.RAZORPAY_ACCOUNT_NUMBER || ''
const USE_REAL_API        = !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_ACCOUNT_NO)

function auth(): string {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
}

async function createContact(name: string): Promise<string> {
  const res  = await fetch('https://api.razorpay.com/v1/contacts', {
    method: 'POST',
    headers: { 'Authorization': auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type: 'vendor' }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(`CONTACT_CREATE_FAILED: ${data?.error?.description || res.status}`)
  return data.id
}

async function createFundAccount(contactId: string, input: BankTransferInput): Promise<string> {
  const res  = await fetch('https://api.razorpay.com/v1/fund_accounts', {
    method: 'POST',
    headers: { 'Authorization': auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_id:   contactId,
      account_type: 'bank_account',
      bank_account: { name: input.recipientName, ifsc: input.ifsc, account_number: input.accountNumber },
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(`FUND_ACCOUNT_CREATE_FAILED: ${data?.error?.description || res.status}`)
  return data.id
}

async function createPayout(fundAccountId: string, input: BankTransferInput) {
  const res  = await fetch('https://api.razorpay.com/v1/payouts', {
    method: 'POST',
    headers: {
      'Authorization': auth(), 'Content-Type': 'application/json',
      'X-Payout-Idempotency': uuidv4(),
    },
    body: JSON.stringify({
      account_number:        RAZORPAY_ACCOUNT_NO,
      fund_account_id:       fundAccountId,
      amount:                input.amount * 100,
      currency:              'INR',
      mode:                  input.transferMode,
      purpose:               'payout',
      narration:             input.description || `${input.transferMode} transfer`,
      queue_if_low_balance:  true,
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(`PAYOUT_FAILED: ${data?.error?.description || res.status}`)
  return { id: data.id as string, utr: (data.utr || data.id) as string, status: data.status as string }
}

export async function processBankTransfer(input: BankTransferInput): Promise<Transaction> {
  const startTime = Date.now()

  if (!USE_REAL_API) {
    console.log('[bank.adapter] Mock mode — add keys to .env for real Razorpay calls')
    return mockTransfer(input, startTime)
  }

  try {
    const contactId     = await createContact(input.recipientName)
    const fundAccountId = await createFundAccount(contactId, input)
    const payout        = await createPayout(fundAccountId, input)
    const durationMs    = Date.now() - startTime

    const ourStatus: Transaction['status'] =
      payout.status === 'processed' ? 'SUCCESS' :
      payout.status === 'failed'    ? 'FAILED'  : 'PENDING'

    return addTransaction({
      type: 'BANK', status: ourStatus, amount: input.amount,
      recipientName: input.recipientName,
      recipientId:   '****' + input.accountNumber.slice(-4),
      bankMode:      input.transferMode, ifsc: input.ifsc,
      accountNumber: '****' + input.accountNumber.slice(-4),
      reference:     payout.utr,
      description:   input.description || `${input.transferMode} transfer`,
      durationMs,
    })
  } catch (err: any) {
    const [code, ...rest] = err.message.split(': ')
    return addTransaction({
      type: 'BANK', status: 'FAILED', amount: input.amount,
      recipientName: input.recipientName,
      recipientId:   '****' + input.accountNumber.slice(-4),
      bankMode:      input.transferMode, ifsc: input.ifsc,
      accountNumber: '****' + input.accountNumber.slice(-4),
      reference: '', description: input.description || `${input.transferMode} transfer`,
      durationMs: Date.now() - startTime,
      errorCode: code || 'RAZORPAY_ERROR', errorMessage: rest.join(': ') || err.message,
    })
  }
}

function mockTransfer(input: BankTransferInput, startTime: number): Promise<Transaction> {
  return new Promise(resolve => setTimeout(() => {
    const durationMs = Date.now() - startTime
    const VALID = ['SBIN','HDFC','ICIC','UTIB','KKBK','PUNB','BARB','CNRB']
    const STALE = ['HDFC0001234','SBIN0001234']
    const prefix = input.ifsc.slice(0, 4)

    const base = { type: 'BANK' as const, amount: input.amount, recipientName: input.recipientName,
      recipientId: '****'+input.accountNumber.slice(-4), bankMode: input.transferMode,
      ifsc: input.ifsc, accountNumber: '****'+input.accountNumber.slice(-4),
      description: input.description || `${input.transferMode} transfer`, durationMs }

    if (!VALID.includes(prefix))
      return resolve(addTransaction({ ...base, status:'FAILED', reference:'', errorCode:'BANK_IFSC_INVALID', errorMessage:`IFSC ${input.ifsc} not in RBI master list` }))
    if (STALE.includes(input.ifsc))
      return resolve(addTransaction({ ...base, status:'FAILED', reference:'', errorCode:'BANK_IFSC_STALE', errorMessage:`IFSC ${input.ifsc} belongs to merged branch` }))
    if (input.transferMode === 'RTGS' && input.amount < 200000)
      return resolve(addTransaction({ ...base, status:'FAILED', reference:'', errorCode:'RTGS_MIN_AMOUNT', errorMessage:'RTGS minimum is ₹2,00,000' }))

    resolve(addTransaction({ ...base, status:'SUCCESS', reference:`MOCK${input.transferMode}${Date.now()}` }))
  }, Math.floor(Math.random()*1000+500)))
}
