const router = require('express').Router()
const auth = require('../middleware/auth')
const Booking = require('../models/Booking')
const nodemailer = require('nodemailer')

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
})

// Save booking
router.post('/', auth, async (req, res) => {
  try {
    const booking = await Booking.create({ 
      ...req.body, 
      userId: req.user.id,
      status: 'Pending'
    })

    // Mail to YOU (owner) with Accept link
    const acceptLink = `${process.env.BACKEND_URL}/api/bookings/${booking._id}/accept`

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'meghacabs7953@gmail.com',
      subject: `🚖 New Booking Request — ${booking.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0f172a;color:white;padding:32px;border-radius:16px;">
          <h2 style="color:#F5C518;">🚖 New Booking — Megha Cabs</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;color:#94A3B8;">Name</td><td style="padding:8px;">${booking.name}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Phone</td><td style="padding:8px;">${booking.phone}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Email</td><td style="padding:8px;">${booking.email}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Service</td><td style="padding:8px;">${booking.service}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">From</td><td style="padding:8px;">${booking.from}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">To</td><td style="padding:8px;">${booking.to}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Date</td><td style="padding:8px;">${booking.date}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Time</td><td style="padding:8px;">${booking.time}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Vehicle</td><td style="padding:8px;">${booking.vehicle || 'Any'}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Notes</td><td style="padding:8px;">${booking.notes || '-'}</td></tr>
          </table>
          <a href="${acceptLink}" 
             style="display:inline-block;background:#F5C518;color:#000;padding:16px 32px;border-radius:8px;font-weight:bold;font-size:18px;text-decoration:none;margin-top:16px;">
            ✅ ACCEPT BOOKING
          </a>
          <p style="color:#94A3B8;margin-top:16px;font-size:12px;">Click accept to send confirmation mail to customer.</p>
        </div>
      `
    })

    res.json(booking)
  } catch (err) {
    console.log('Booking error:', err)
    res.status(500).json({ msg: 'Server error' })
  }
})

// Accept booking — you click this link in your email
router.get('/:id/accept', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'Confirmed' },
      { new: true }
    )

    if (!booking) return res.status(404).send('Booking not found')

    // Mail to CUSTOMER
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: booking.email,
      subject: `✅ Booking Confirmed — Megha Cabs`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0f172a;color:white;padding:32px;border-radius:16px;">
          <h2 style="color:#F5C518;">✅ Your Booking is Confirmed!</h2>
          <p>Hi ${booking.name}, your ride has been confirmed by Megha Cabs.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;color:#94A3B8;">Service</td><td style="padding:8px;">${booking.service}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">From</td><td style="padding:8px;">${booking.from}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">To</td><td style="padding:8px;">${booking.to}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Date</td><td style="padding:8px;">${booking.date}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Time</td><td style="padding:8px;">${booking.time}</td></tr>
            <tr><td style="padding:8px;color:#94A3B8;">Vehicle</td><td style="padding:8px;">${booking.vehicle || 'Any available'}</td></tr>
          </table>
          <p style="color:#94A3B8;">Our driver will contact you before pickup. For any queries:</p>
          <p>📞 +91 95859 23990</p>
          <p>💬 WhatsApp: +91 9585923990</p>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e293b;color:#94A3B8;font-size:12px;">
            🚖 Megha Cabs — Your Comfort Is Our First Priority
          </div>
        </div>
      `
    })

    // Success page
    res.send(`
      <html>
        <body style="font-family:sans-serif;background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h1 style="color:#F5C518;">✅ Booking Accepted!</h1>
            <p>Confirmation mail sent to ${booking.email}</p>
            <p style="color:#94A3B8;">Customer: ${booking.name} | ${booking.from} → ${booking.to}</p>
          </div>
        </body>
      </html>
    `)
  } catch (err) {
    console.log('Accept error:', err)
    res.status(500).send('Error accepting booking')
  }
})

// Get my bookings
router.get('/mine', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ msg: 'Server error' })
  }
})

module.exports = router