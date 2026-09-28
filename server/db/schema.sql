-- Basim The Barber — booking system database
-- Run this once against MySQL to create the schema:
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS basim_barber CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE basim_barber;

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_kr INT NOT NULL,
  duration_min INT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  service_id INT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

INSERT INTO services (name, price_kr, duration_min) VALUES
  ('Haircut & Fade', 150, 45),
  ('Beard Trim & Shape', 80, 20),
  ('Full Groom Package', 200, 75),
  ('Kids'' Haircut', 100, 30),
  ('Hot Towel Shave', 120, 35),
  ('Style Consultation', 0, 15);
