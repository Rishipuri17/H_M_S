-- ================================================================
-- HOSPITAL MANAGEMENT SYSTEM - FIXED SCHEMA
-- Run this in Supabase SQL Editor (replaces the old schema)
-- ================================================================

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS equipment_usage_log CASCADE;
DROP TABLE IF EXISTS room_assignments CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS maintenance_records CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'staff', 'viewer')) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. ROOMS  (status values lowercase to match app)
-- ============================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(50) UNIQUE NOT NULL,
    room_type VARCHAR(100) CHECK (room_type IN ('ICU', 'General Ward', 'Private Room', 'Emergency', 'Operating Theater', 'Laboratory', 'Radiology', 'Consultation')) NOT NULL,
    floor_number INTEGER NOT NULL DEFAULT 1,
    building VARCHAR(100),
    capacity INTEGER DEFAULT 1,
    current_occupancy INTEGER DEFAULT 0,
    status VARCHAR(50) CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved', 'cleaning')) DEFAULT 'available',
    bed_count INTEGER DEFAULT 1,
    has_oxygen BOOLEAN DEFAULT false,
    has_ventilator BOOLEAN DEFAULT false,
    has_monitor BOOLEAN DEFAULT false,
    daily_rate DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. EQUIPMENT  (status values lowercase)
-- ============================================
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100) CHECK (equipment_type IN ('Medical Device', 'Diagnostic', 'Surgical', 'Life Support', 'Monitoring', 'Laboratory', 'Imaging', 'Other')) NOT NULL,
    model_number VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    manufacturer VARCHAR(255),
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    warranty_expiry DATE,
    status VARCHAR(50) CHECK (status IN ('operational', 'maintenance', 'out_of_service', 'reserved', 'disposed')) DEFAULT 'operational',
    location VARCHAR(255),
    department VARCHAR(100),
    criticality VARCHAR(50) CHECK (criticality IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. INVENTORY  (status auto-computed by stock levels)
-- ============================================
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    code VARCHAR(100) UNIQUE,
    description TEXT,
    unit_of_measurement VARCHAR(50) DEFAULT 'pieces',
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    maximum_stock INTEGER DEFAULT 1000,
    unit_price DECIMAL(10, 2),
    supplier VARCHAR(255),
    storage_location VARCHAR(255),
    expiry_date DATE,
    status VARCHAR(50) CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')) DEFAULT 'in_stock',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. MAINTENANCE RECORDS
-- ============================================
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('Preventive', 'Corrective', 'Emergency', 'Calibration', 'Inspection', 'Upgrade')) NOT NULL,
    asset_name VARCHAR(255),
    asset_type VARCHAR(50) CHECK (asset_type IN ('Equipment', 'Room', 'Building')),
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    maintenance_date TIMESTAMP NOT NULL,
    completed_date TIMESTAMP,
    status VARCHAR(50) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
    performed_by VARCHAR(255),
    issue_description TEXT,
    action_taken TEXT,
    cost DECIMAL(10, 2),
    priority VARCHAR(50) CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. PATIENTS
-- ============================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    admission_date TIMESTAMP,
    discharge_date TIMESTAMP,
    current_room UUID REFERENCES rooms(id) ON DELETE SET NULL,
    status VARCHAR(50) CHECK (status IN ('admitted', 'under_observation', 'emergency', 'discharged')) DEFAULT 'admitted',
    insurance_provider VARCHAR(255),
    allergies TEXT,
    medical_history TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_dept ON equipment(department);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_maintenance_status ON maintenance_records(status);
CREATE INDEX idx_maintenance_priority ON maintenance_records(priority);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_room ON patients(current_room);

-- ============================================
-- RLS - Open policies (app handles role checks)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Allow full access via anon key (app enforces roles in UI)
CREATE POLICY "allow_all_users"        ON users        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rooms"        ON rooms        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_equipment"    ON equipment    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_inventory"    ON inventory    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_maintenance"  ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_patients"     ON patients     FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Demo users (passwords are checked in app logic, not DB)
INSERT INTO users (email, full_name, role, phone, department) VALUES
('admin@hospital.com',  'John Admin',  'admin',  '1234567890', 'Administration'),
('staff@hospital.com',  'Jane Staff',  'staff',  '1234567891', 'Emergency'),
('viewer@hospital.com', 'Bob Viewer',  'viewer', '1234567892', 'IT');

-- Sample rooms
INSERT INTO rooms (room_number, room_type, floor, building, capacity, status, bed_count, has_oxygen, has_ventilator, has_monitor, daily_rate) VALUES
('101',   'ICU',              1, 'Main Building',  1, 'available',  1, true,  true,  true,  5000.00),
('102',   'ICU',              1, 'Main Building',  1, 'occupied',   1, true,  true,  true,  5000.00),
('201',   'General Ward',     2, 'Main Building',  4, 'available',  4, true,  false, false, 1500.00),
('202',   'Private Room',     2, 'Main Building',  1, 'available',  1, true,  false, true,  3000.00),
('301',   'Operating Theater',3, 'Surgical Wing',  1, 'available',  1, true,  true,  true, 10000.00),
('ER-01', 'Emergency',        0, 'Emergency Wing', 2, 'available',  2, true,  true,  true,  2000.00);

-- Sample equipment
INSERT INTO equipment (equipment_name, equipment_type, model_number, serial_number, manufacturer, status, department, criticality) VALUES
('Ventilator Pro 3000', 'Life Support',  'VP3000',  'SN001', 'MedTech Inc',    'operational', 'ICU',       'critical'),
('X-Ray Machine',       'Imaging',       'XR500',   'SN002', 'RadiHealth',     'operational', 'Radiology', 'high'),
('ECG Monitor',         'Monitoring',    'ECG-100', 'SN003', 'CardioSys',      'operational', 'Emergency', 'high'),
('Defibrillator',       'Medical Device','DF-2000', 'SN004', 'LifeSaver Corp', 'operational', 'Emergency', 'critical'),
('Surgical Table',      'Surgical',      'ST-500',  'SN005', 'SurgEquip Ltd',  'maintenance', 'Surgery',   'medium');

-- Sample inventory
INSERT INTO inventory (item_name, category, code, current_stock, minimum_stock, unit_price, supplier, status) VALUES
('Paracetamol 500mg',   'Medication',       'MED001', 500,  100, 0.50, 'PharmaCorp',   'in_stock'),
('Surgical Gloves (M)', 'Surgical Supply',  'DIS001', 1000, 200, 0.25, 'MedSupply Co', 'in_stock'),
('N95 Masks',           'PPE',              'PPE001', 50,   150, 2.00, 'SafetyFirst',  'low_stock'),
('Syringes 5ml',        'Surgical Supply',  'SUR001', 2000, 500, 0.15, 'MedSupply Co', 'in_stock'),
('Saline Solution 1L',  'Medication',       'MED002', 0,    50,  3.50, 'PharmaCorp',   'out_of_stock');

-- Sample maintenance records
INSERT INTO maintenance_records (maintenance_type, asset_name, asset_type, status, priority, performed_by, issue_description, maintenance_date) VALUES
('Preventive', 'Ventilator Pro 3000', 'Equipment', 'completed', 'high',   'Tech Team A', 'Routine 6-month service',          NOW() - INTERVAL '10 days'),
('Corrective', 'Surgical Table',      'Equipment', 'in_progress','critical','Tech Team B', 'Hydraulic system failure',         NOW() - INTERVAL '2 days'),
('Inspection', 'ECG Monitor',         'Equipment', 'scheduled',  'medium', 'Tech Team A', 'Annual calibration check required', NOW() + INTERVAL '5 days');

-- Sample patients
INSERT INTO patients (patient_id, patient_name, date_of_birth, gender, blood_group, phone, status, admission_date) VALUES
('PT-2024-001', 'Alice Johnson',  '1985-05-15', 'Female', 'A+', '9876543210', 'admitted',          NOW() - INTERVAL '3 days'),
('PT-2024-002', 'Bob Smith',      '1990-08-22', 'Male',   'O+', '9876543211', 'under_observation', NOW() - INTERVAL '1 day'),
('PT-2024-003', 'Carol Williams', '1978-12-10', 'Female', 'B+', '9876543212', 'emergency',         NOW()),
('PT-2024-004', 'David Brown',    '1995-03-18', 'Male',   'AB-','9876543213', 'discharged',        NOW() - INTERVAL '7 days');
