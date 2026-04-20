import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validate key format — supabase-js v2 requires the classic eyJ... JWT anon key
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase env vars missing! Check your .env file.')
} else if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error(
    '❌ Invalid VITE_SUPABASE_ANON_KEY format.\n' +
    'supabase-js v2 requires the classic JWT key (starts with "eyJ...").\n' +
    'Go to: Supabase Dashboard → Project Settings → API → "anon public" key\n' +
    'Do NOT use the new sb_publishable_... key with this SDK version.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,   // We manage sessions via sessionStorage in AuthContext
    autoRefreshToken: false,
  },
  global: {
    fetch: (...args) => fetch(...args), // Explicit fetch to surface network errors
  },
})

export const db = {
  // Users
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  },

  async createUser(user) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
    return { data, error }
  },

  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  // Rooms - EXACT schema match
  async getRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('room_number')
    return { data: data || [], error }
  },

  async createRoom(room) {
    const { data, error } = await supabase
      .from('rooms')
      .insert([room])
      .select()
    return { data, error }
  },

  async updateRoom(id, updates) {
    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteRoom(id) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Equipment - EXACT schema match
  async getEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  },

  async createEquipment(equipment) {
    const { data, error } = await supabase
      .from('equipment')
      .insert([equipment])
      .select()
    return { data, error }
  },

  async updateEquipment(id, updates) {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteEquipment(id) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Inventory - EXACT schema match
  async getInventory() {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name')
    return { data: data || [], error }
  },

  async createInventoryItem(item) {
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select()
    return { data, error }
  },

  async updateInventoryItem(id, updates) {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteInventoryItem(id) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Maintenance Records - EXACT schema match
  async getMaintenanceRecords() {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*, equipment(equipment_name, serial_number)')
      .order('maintenance_date', { ascending: false })
    return { data: data || [], error }
  },

  async createMaintenanceRecord(record) {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert([record])
      .select()
    return { data, error }
  },

  async updateMaintenanceRecord(id, updates) {
    const { data, error } = await supabase
      .from('maintenance_records')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deleteMaintenanceRecord(id) {
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Patients - EXACT schema match
  async getPatients() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  },

  async createPatient(patient) {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
    return { data, error }
  },

  async updatePatient(id, updates) {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async deletePatient(id) {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Dashboard Stats
  // In your db object, update getDashboardStats:

  async getDashboardStats() {
    const [rooms, equipment, inventory, maintenance, patients] = await Promise.all([
      supabase.from('rooms').select('status'),
      supabase.from('equipment').select('status'),
      supabase.from('inventory').select('current_stock, minimum_stock, status'),
      supabase.from('maintenance_records').select('status'),
      supabase.from('patients').select('status')
    ])

    return {
      rooms: rooms.data || [],
      equipment: equipment.data || [],
      inventory: inventory.data || [],
      maintenance: maintenance.data || [],
      patients: patients.data || []
    }
  }
}