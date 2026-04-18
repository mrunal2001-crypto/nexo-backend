type BankMode = 'NEFT' | 'IMPS' | 'RTGS'

type ApiResult<T = any> = {
  success: boolean
  data?: T
  error?: string
}

const RAZORPAY_ACCOUNT_NUMBER = process.env.RAZORPAY_ACCOUNT_NUMBER || ''

function shortId(): string {
  return Math.random().toString(36).substr(2, 9)
}

async function razorpayFetch(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`http://localhost:3001/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return response.json()
}

export async function callBankTransfer(input: { accountNumber: string; ifsc: string; transferMode: BankMode; amount: number; recipientName: string; description: string }): Promise<ApiResult> {
  try {
    // For testing, use a mock contact ID if backend contact endpoint is not implemented
    const contact = { id: 'mock_contact_' + shortId() }

    const fundAccount = await razorpayFetch('/bank/fund-account', {
      contact_id: contact.id,
      recipientName: input.recipientName,
      ifsc: input.ifsc,
      accountNumber: input.accountNumber,
      description: input.description
    })

    const payout = await razorpayFetch('/bank/payout', {
      account_number: RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccount.fundAccount.id,
      amount: input.amount * 100,
      currency: 'INR',
      mode: input.transferMode,
      purpose: 'payout',
      narration: input.description,
      reference_id: `payout-${shortId()}`,
      queue_if_low_balance: true
    })

    return { success: true, data: { contact, fundAccount, payout } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}