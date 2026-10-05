import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './routes/auth.routes'
import { usersRouter } from './routes/users.routes'
import { creatorsRouter } from './routes/creators.routes'
import { postsRouter } from './routes/posts.routes'
import { subscriptionsRouter } from './routes/subscriptions.routes'
import { messagesRouter } from './routes/messages.routes'
import { paymentsRouter } from './routes/payments.routes'
import { payoutsRouter } from './routes/payouts.routes'
import { notificationsRouter } from './routes/notifications.routes'
import { paymentMethodsRouter } from './routes/paymentMethods.routes'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/creators', creatorsRouter)
app.use('/posts', postsRouter)
app.use('/subscriptions', subscriptionsRouter)
app.use('/messages', messagesRouter)
app.use('/payments', paymentsRouter)
app.use('/payouts', payoutsRouter)
app.use('/notifications', notificationsRouter)
app.use('/payment-methods', paymentMethodsRouter)

app.use(errorHandler)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`CreatorHub API listening on http://localhost:${PORT}`)
})
