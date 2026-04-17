import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import apiRoutes from './routes/api.routes'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Request logger middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

app.use('/api', apiRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'NEXO API', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`\n🚀 NEXO API running on http://localhost:${PORT}`)
  console.log(`   Health:       GET  /health`)
  console.log(`   Transactions: GET  /api/transactions`)
  console.log(`   Stats:        GET  /api/stats`)
  console.log(`   UPI Payout:   POST /api/upi/payout`)
  console.log(`   GST Invoice:  POST /api/gstn/invoice`)
  console.log(`   Bank Contact: POST /api/bank/contact`)
  console.log(`   Bank Fund Acct:POST /api/bank/fund-account`)
  console.log(`   Bank Payout:  POST /api/bank/payout`)
  console.log(`   Bank Transfer:POST /api/bank/transfer\n`)
})

export default app
