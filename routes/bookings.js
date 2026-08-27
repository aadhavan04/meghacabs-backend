const router = require('express').Router()
const auth = require('../middleware/auth')
const Booking = require('../models/Booking')

const formSubmitEmail = process.env.FORM_SUBMIT_EMAIL || 'meghacabs7953@gmail.com'

const sendFormSubmitEmail = async (booking, acceptLink) => {
  const confirmed = !acceptLink
  const response = await fetch(`https://formsubmit.co/ajax/${formSubmitEmail}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: confirmed ? 'Booking Confirmed - Megha Cabs' : `New Booking Request - ${booking.name}`,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: confirmed
        ? `Hi ${booking.name}, your Megha Cabs booking is confirmed.\n\nFrom: ${booking.from}\nTo: ${booking.to}\nDate: ${booking.date}\nTime: ${booking.time}`
        : `Hi ${booking.name}, we received your Megha Cabs booking request. Our team will review it and send a confirmation soon.\n\nFrom: ${booking.from}\nTo: ${booking.to}\nDate: ${booking.date}\nTime: ${booking.time}`,
      email: booking.email,
      name: booking.name,
      phone: booking.phone,
      service: booking.service,
      from: booking.from,
      to: booking.to,
      date: booking.date,
      time: booking.time,
      vehicle: booking.vehicle || 'Any',
      notes: booking.notes || '-',
      accept_booking: acceptLink,
    }),
  })

  if (!response.ok) {
    throw new Error(`FormSubmit returned ${response.status}`)
  }
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

    sendFormSubmitEmail(booking, acceptLink).catch(mailError => {
      console.error('Booking saved, but FormSubmit email failed:', mailError.message)
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
    await sendFormSubmitEmail(booking, '')

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