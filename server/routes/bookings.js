const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

const PHONE_RE = /^[0-9+\s-]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-ZÀ-ſ'.\s-]{2,120}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

router.post('/', async (req, res) => {
  let { customer_name, phone, email, service_id, booking_date, booking_time } = req.body;

  if (!customer_name || !phone || !service_id || !booking_date || !booking_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  customer_name = String(customer_name).trim();
  phone = String(phone).trim();
  email = email ? String(email).trim() : '';
  booking_date = String(booking_date).trim();
  booking_time = String(booking_time).trim();

  if (!NAME_RE.test(customer_name)) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  if (email && (email.length > 150 || !EMAIL_RE.test(email))) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!DATE_RE.test(booking_date) || isNaN(Date.parse(booking_date))) {
    return res.status(400).json({ error: 'Invalid date' });
  }
  if (!TIME_RE.test(booking_time)) {
    return res.status(400).json({ error: 'Invalid time' });
  }
  if (new Date(`${booking_date}T${booking_time}:00`) < new Date()) {
    return res.status(400).json({ error: 'Booking must be in the future' });
  }
  const serviceIdNum = Number(service_id);
  if (!Number.isInteger(serviceIdNum) || serviceIdNum <= 0) {
    return res.status(400).json({ error: 'Invalid service' });
  }

  customer_name = escapeHtml(customer_name);

  try {
    const [services] = await pool.query('SELECT id FROM services WHERE id = ?', [serviceIdNum]);
    if (services.length === 0) {
      return res.status(400).json({ error: 'Unknown service' });
    }

    const [clash] = await pool.query(
      'SELECT id FROM bookings WHERE booking_date = ? AND booking_time = ? AND status != "cancelled"',
      [booking_date, booking_time]
    );
    if (clash.length > 0) {
      return res.status(409).json({ error: 'That time slot is already booked' });
    }

    const [result] = await pool.query(
      `INSERT INTO bookings (customer_name, phone, email, service_id, booking_date, booking_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_name, phone, email || null, serviceIdNum, booking_date, booking_time]
    );

    res.status(201).json({ id: result.insertId, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.customer_name, b.phone, b.email, b.booking_date, b.booking_time,
              b.status, s.name AS service_name, s.price_kr
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       ORDER BY b.booking_date, b.booking_time`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;
