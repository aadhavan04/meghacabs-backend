const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     String,
  phone:    String,
  email:    String,
  service:  String,
  from:     String,
  to:       String,
  date:     String,
  time:     String,
  vehicle:  String,
  notes:    String,
  }, { timestamps: true })

module.exports = mongoose.model('Booking', BookingSchema)