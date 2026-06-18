const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dns = require('dns')
require('dotenv').config()

// DNS fix — FIRST before everything
dns.setServers(['8.8.8.8', '8.8.4.4'])
dns.setDefaultResultOrder('ipv4first')

const app = express()
app.use(cors({
  origin: 'https://meghacabs-frontend.onrender.com',
  credentials: true
}))
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ DB Error:', err))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/bookings', require('./routes/bookings'))

// Test route
app.get('/test', (req, res) => res.json({ msg: 'Backend working!' }))

app.listen(process.env.PORT || 5000, () => {
  console.log('Server running on port 5000')
})