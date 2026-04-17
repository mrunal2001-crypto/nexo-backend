# NEXO — Finance Integration Hub

## What this is
A complete payment integration backend that unifies UPI, GSTN, and Bank APIs with schema validation, error handling, and audit logging.

## Project structure
```
nexo/
├── src/
│   ├── index.ts                  ← Express server entry point
│   ├── db/store.ts               ← In-memory database + dummy data
│   ├── middleware/schemas.ts     ← Zod validation schemas
│   ├── adapters/
│   │   ├── upi.adapter.ts        ← UPI payout logic
│   │   ├── gstn.adapter.ts       ← GSTN invoice logic
│   │   └── bank.adapter.ts       ← Bank transfer logic
│   └── routes/api.routes.ts      ← All API endpoints
├── dist/                         ← Compiled JS (run: npm run build)
└── README.md
```

## API Endpoints
| Method | URL | What it does |
|--------|-----|--------------|
| GET | /health | Server health check |
| GET | /api/stats | Dashboard metrics |
| GET | /api/transactions | All transactions (filter by type, status) |
| GET | /api/transactions/:id | Single transaction detail |
| POST | /api/upi/payout | Send UPI payment |
| POST | /api/gstn/invoice | File GST invoice |
| POST | /api/bank/transfer | Bank NEFT/IMPS/RTGS |
| GET | /api/audit-logs | Full audit log |

## Run locally
```bash
npm install
npm run build     # compile TypeScript
node dist/index.js  # start server on port 3001
```

## Sample API calls

### UPI Payout
```bash
curl -X POST http://localhost:3001/api/upi/payout \
  -H "Content-Type: application/json" \
  -d '{
    "payerVpa": "nexo.business@axis",
    "payeeVpa": "vendor@hdfc",
    "amount": 5000,
    "currency": "INR",
    "recipientName": "Raj Electricals",
    "merchantTxnId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### GST Invoice
```bash
curl -X POST http://localhost:3001/api/gstn/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "gstin": "27AAPFU0939F1ZV",
    "recipientName": "Acme Pvt Ltd",
    "invoiceNo": "INV-2024-090",
    "invoiceDate": "09/04/2024",
    "supplyType": "B2B",
    "amount": 84000
  }'
```

### Bank Transfer
```bash
curl -X POST http://localhost:3001/api/bank/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "123456789012",
    "ifsc": "SBIN0007894",
    "transferMode": "NEFT",
    "amount": 55000,
    "recipientName": "Priya Sharma",
    "description": "Monthly salary"
  }'
```

## Valid test data
- GSTIN: 27AAPFU0939F1ZV, 06BZAHM6385P6Z2, 29AAGCB5311D1ZF
- IFSC prefixes that work: SBIN, HDFC, ICIC, UTIB, KKBK
- IFSC that trigger "stale" error: HDFC0001234, SBIN0001234
- UPI domains that work: @hdfc, @sbi, @axis, @icici, @okicici, @ybl, @paytm
