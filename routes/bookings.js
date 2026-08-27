const router = require('express').Router()
const auth = require('../middleware/auth')
const Booking = require('../models/Booking')

const ownerEmail = process.env.OWNER_EMAIL || 'meghacabs7953@gmail.com'
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

const sendResendEmail = async (to, subject, html, replyTo) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend returned ${response.status}: ${errorText}`)
  }
}

const sendBookingEmails = async (booking, acceptLink) => {
  const confirmed = !acceptLink
  const subject = confirmed ? 'Booking Confirmed - Megha Cabs' : `New Booking Request - ${booking.name}`
  const heading = confirmed ? 'Your Booking is Confirmed!' : 'New Booking Request'
  const message = confirmed
    ? `Hi ${booking.name}, your Megha Cabs booking is confirmed.`
    : `Hi ${booking.name}, we received your Megha Cabs booking request.`
  const details = `<p><strong>From:</strong> ${booking.from}</p><p><strong>To:</strong> ${booking.to}</p><p><strong>Date:</strong> ${booking.date}</p><p><strong>Time:</strong> ${booking.time}</p><p><strong>Vehicle:</strong> ${booking.vehicle || 'Any'}</p><p><strong>Notes:</strong> ${booking.notes || '-'}</p>`
  const customerHtml = `<h2>${heading}</h2><p>${message}</p>${details}`
  const ownerHtml = `<h2>New Booking - Megha Cabs</h2><p>Customer: ${booking.name}</p><p>Email: ${booking.email}</p><p>Phone: ${booking.phone}</p><p>Service: ${booking.service}</p>${details}<p>Accept booking: <a href="${acceptLink}">${acceptLink}</a></p>`

  await Promise.all([
    sendResendEmail(ownerEmail, subject, ownerHtml, booking.email),
    sendResendEmail(booking.email, subject, customerHtml),
  ])
}

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

    sendBookingEmails(booking, acceptLink).catch(mailError => {
      console.error('Booking saved, but Resend email failed:', mailError.message)
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

    // Notify the customer through FormSubmit after confirmation.
    await sendBookingEmails(booking, '')

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