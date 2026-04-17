import { Router, Request, Response } from 'express'
import { ZodError } from 'zod'
import { UpiPayoutSchema, GstnInvoiceSchema, BankTransferSchema, BankPayoutSchema } from '../middleware/schemas'
import { processUpiPayout } from '../adapters/upi.adapter'
import { processGstnInvoice } from '../adapters/gstn.adapter'
import { processBankTransfer } from '../adapters/bank.adapter'
import { transactions, auditLogs } from '../db/store'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

function zodError(res: Response, err: ZodError) {
  return res.status(400).json({
    success: false,
    error: 'SCHEMA_VALIDATION_FAILED',
    fields: err.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
  })
}

router.post('/upi/payout', async (req: Request, res: Response) => {
  const parsed = UpiPayoutSchema.safeParse(req.body)
  if (!parsed.success) return zodError(res, parsed.error)
  try {
    const txn = await processUpiPayout(parsed.data)
    return res.status(txn.status === 'SUCCESS' ? 200 : 422).json({ success: txn.status === 'SUCCESS', transaction: txn })
  } catch (e) { return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' }) }
})

router.post('/gstn/invoice', async (req: Request, res: Response) => {
  const parsed = GstnInvoiceSchema.safeParse(req.body)
  if (!parsed.success) return zodError(res, parsed.error)
  try {
    const txn = await processGstnInvoice(parsed.data)
    return res.status(txn.status === 'SUCCESS' ? 201 : 422).json({ success: txn.status === 'SUCCESS', transaction: txn })
  } catch (e) { return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' }) }
})

// Razorpay needs: Contact -> Fund Account -> Payout (3 steps)
// This handles step 1. Called by bank.adapter.ts automatically.
router.post('/bank/contact', async (req: Request, res: Response) => {
  const { name, type = 'vendor' } = req.body
  if (!name) return res.status(400).json({ success: false, error: 'name is required' })

  const KEY_ID     = process.env.RAZORPAY_KEY_ID     || ''
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''

  if (!KEY_ID || !KEY_SECRET) {
    console.log('[/bank/contact] No Razorpay keys in .env — returning mock contact')
    return res.json({
      success: true, mock: true,
      message: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file',
      contact: { id: 'cont_mock_' + Date.now(), name, type }
    })
  }

  try {
    const r = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, type }),
    })
    const data = await r.json() as any
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        error: data.error?.description || 'Razorpay error',
        hint: r.status === 401 ? 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env is wrong. Check razorpay.com > Settings > API Keys' : undefined
      })
    }
    return res.json({ success: true, contact: data })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// Razorpay needs: Contact -> Fund Account -> Payout (3 steps)
// This handles step 2. Called by bank.adapter.ts automatically.
router.post('/bank/fund-account', async (req: Request, res: Response) => {
  const { contact_id, recipientName, ifsc, accountNumber, description } = req.body

  if (!contact_id || !recipientName || !ifsc || !accountNumber) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: contact_id, recipientName, ifsc, accountNumber'
    })
  }

  const KEY_ID     = process.env.RAZORPAY_KEY_ID     || ''
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''

  if (!KEY_ID || !KEY_SECRET) {
    console.log('[/bank/fund-account] No Razorpay keys in .env — returning mock fund account')
    return res.json({
      success: true, mock: true,
      message: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file',
      fundAccount: {
        id: 'fa_mock_' + Date.now(),
        contact_id,
        account_type: 'bank_account',
        bank_account: { name: recipientName, ifsc, account_number: accountNumber },
        active: true
      }
    })
  }

  try {
    const r = await fetch('https://api.razorpay.com/v1/fund-account', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id,
        account_type: 'bank_account',
        bank_account: {
          name: recipientName,
          ifsc,
          account_number: accountNumber
        },
        notes: { description }
      }),
    })
    const data = await r.json() as any
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        error: data.error?.description || 'Razorpay error',
        hint: r.status === 401 ? 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env is wrong' : undefined
      })
    }
    return res.json({ success: true, fundAccount: data })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// Razorpay needs: Contact -> Fund Account -> Payout (3 steps)
// This handles step 3. Called after fund-account.
router.post('/bank/payout', async (req: Request, res: Response) => {
  const parsed = BankPayoutSchema.safeParse(req.body)
  if (!parsed.success) return zodError(res, parsed.error)

  const KEY_ID     = process.env.RAZORPAY_KEY_ID     || ''
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''

  if (!KEY_ID || !KEY_SECRET) {
    console.log('[/bank/payout] No Razorpay keys in .env — returning mock payout')
    return res.json({
      success: true, mock: true,
      message: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file',
      payout: {
        id: 'pout_mock_' + Date.now(),
        fund_account_id: parsed.data.fund_account_id,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        mode: parsed.data.mode,
        status: 'processed',
        utr: 'MOCKUTR' + Date.now(),
        reference_id: parsed.data.reference_id
      }
    })
  }

  try {
    const r = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
        'X-Payout-Idempotency': uuidv4(),
      },
      body: JSON.stringify(parsed.data),
    })
    const data = await r.json() as any
    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        error: data.error?.description || 'Razorpay error',
        hint: r.status === 401 ? 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env is wrong' : undefined
      })
    }
    return res.json({ success: true, payout: data })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/bank/transfer', async (req: Request, res: Response) => {
  const parsed = BankTransferSchema.safeParse(req.body)
  if (!parsed.success) return zodError(res, parsed.error)
  try {
    const txn = await processBankTransfer(parsed.data)
    return res.status(txn.status === 'SUCCESS' ? 200 : txn.status === 'PENDING' ? 202 : 422).json({ success: txn.status !== 'FAILED', transaction: txn })
  } catch (e) { return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' }) }
})

// Razorpay calls this when a payout status changes (processed/failed)
// Set in Razorpay Dashboard > Settings > Webhooks > Add Webhook
// Events: payout.processed, payout.failed, payout.reversed
router.post('/bank/webhook', (req: Request, res: Response) => {
  const event    = req.body.event
  const entity   = req.body.payload?.payout?.entity
  const payoutId = entity?.id
  const utr      = entity?.utr
  const status   = entity?.status

  console.log(`[webhook] ${event} | payout: ${payoutId} | status: ${status} | utr: ${utr}`)

  const txn = transactions.find((t: any) => t.razorpayPayoutId === payoutId)
  if (txn) {
    txn.status    = status === 'processed' ? 'SUCCESS' : 'FAILED'
    txn.reference = utr || txn.reference
    console.log(`[webhook] Updated transaction ${txn.id} -> ${txn.status}`)
  }

  return res.status(200).json({ received: true }) // always 200 or Razorpay retries
})

router.get('/transactions', (_req: Request, res: Response) => {
  const { type, status, limit = '50' } = _req.query
  let result = [...transactions]
  if (type)   result = result.filter(t => t.type === type)
  if (status) result = result.filter(t => t.status === status)
  return res.json({ success: true, transactions: result.slice(0, parseInt(limit as string)), total: result.length })
})

router.get('/transactions/:id', (req: Request, res: Response) => {
  const txn = transactions.find(t => t.id === req.params.id || t.traceId === req.params.id)
  if (!txn) return res.status(404).json({ success: false, error: 'NOT_FOUND' })
  return res.json({ success: true, transaction: txn })
})

router.get('/audit-logs', (_req: Request, res: Response) => {
  return res.json({ success: true, logs: auditLogs.slice(0, 100) })
})

router.get('/stats', (_req: Request, res: Response) => {
  const upi  = transactions.filter(t => t.type === 'UPI')
  const gstn = transactions.filter(t => t.type === 'GSTN')
  const bank = transactions.filter(t => t.type === 'BANK')
  const upiOk = upi.filter(t => t.status === 'SUCCESS')
  return res.json({
    success: true,
    mode: process.env.RAZORPAY_KEY_ID ? 'live' : 'mock',
    stats: {
      totalSentToday:     transactions.filter(t => t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0),
      upiSuccessRate:     upi.length ? Math.round(upiOk.length / upi.length * 1000) / 10 : 0,
      gstnInvoicesFiled:  gstn.filter(t => t.status === 'SUCCESS').length,
      bankTransfersCount: bank.filter(t => t.status === 'SUCCESS').length,
      failedCount:        transactions.filter(t => t.status === 'FAILED').length,
      pendingCount:       transactions.filter(t => t.status === 'PENDING').length,
      bankAvgLatencyMs:   bank.length ? Math.round(bank.reduce((s, t) => s + t.durationMs, 0) / bank.length) : 0,
      itcClaimable:       gstn.filter(t => t.itcEligible && t.status === 'SUCCESS').reduce((s, t) => s + t.amount * 0.12, 0),
      needsAttention:     transactions.filter(t => t.status === 'FAILED' || t.status === 'PENDING'),
    }
  })
})

export default router
