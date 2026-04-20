# 🚀 QUICK START GUIDE - Hospital Management System

## ⚡ 5-Minute Setup

### 1️⃣ Set Up Supabase (2 minutes)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Name it: "Hospital-HMS"
4. Choose a password and region
5. Click "Create new project" (wait 1-2 minutes)

### 2️⃣ Create Database (1 minute)

1. In your Supabase project, click "SQL Editor" in the left sidebar
2. Open the `supabase-schema.sql` file from this project
3. Copy ALL the contents
4. Paste into Supabase SQL Editor
5. Click "Run" button
6. ✅ You should see "Success. No rows returned"

### 3️⃣ Get API Keys (30 seconds)

1. Click "Settings" (gear icon) in left sidebar
2. Click "API" under Project Settings
3. Copy these two values:
   - `Project URL` (example: https://abcdefgh.supabase.co)
   - `anon public` key (long string starting with eyJ...)

### 4️⃣ Configure Project (30 seconds)

1. Open the project folder in your code editor
2. Create a new file called `.env` (no extension)
3. Add these lines (replace with YOUR values):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5️⃣ Install & Run (1 minute)

```bash
# Open terminal in project folder
npm install

# After installation completes
npm run dev
```

### 6️⃣ Login & Test

Open browser to: http://localhost:3000

Login with:
- **Email**: admin@hospital.com (Admin access)
- **Email**: staff@hospital.com (Staff access)
- **Email**: viewer@hospital.com (View-only access)

## ✅ Verification Checklist

After setup, verify:
- [ ] Can login successfully
- [ ] Dashboard shows statistics
- [ ] Can view rooms (should see 6 sample rooms)
- [ ] Can view equipment (should see 5 sample items)
- [ ] Can view inventory (should see 5 sample items)
- [ ] Analytics page shows charts

## 🎯 What to Do Next

### As Admin (admin@hospital.com):
1. Add a new room
2. Add equipment
3. Create maintenance records
4. Add patients

### As Staff (staff@hospital.com):
1. Update room status
2. Log maintenance
3. Update inventory

### As Viewer (viewer@hospital.com):
1. View all data
2. Cannot create/edit/delete

## 🗄️ Database Tables Created

The SQL script creates these tables with sample data:
- ✅ users (3 demo users)
- ✅ rooms (6 sample rooms)
- ✅ equipment (5 sample equipment)
- ✅ inventory (5 sample items)
- ✅ maintenance_records (empty, ready for use)
- ✅ patients (3 sample patients)
- ✅ inventory_transactions (empty, ready for use)
- ✅ room_assignments (empty, ready for use)
- ✅ equipment_usage_log (empty, ready for use)

## 🔧 Troubleshooting

### Problem: "npm install" fails
**Solution**: Make sure you have Node.js installed (v16+)
Download from: https://nodejs.org

### Problem: Cannot see any data
**Solution**: 
1. Check if SQL script ran successfully in Supabase
2. Look for green "Success" message
3. Go to Supabase > Table Editor to verify tables exist

### Problem: Login doesn't work
**Solution**: 
1. Check .env file has correct URL and key
2. Make sure there are NO spaces in .env file
3. Restart the dev server (Ctrl+C, then npm run dev)

### Problem: "Failed to fetch"
**Solution**: 
1. Verify Supabase URL in .env matches your project URL
2. Check Supabase project is running (green dot)
3. Try refreshing the page

## 📊 For ML/Data Science

This system generates rich data across:

**Rooms**: Occupancy patterns, utilization rates
**Equipment**: Failure rates, maintenance patterns  
**Inventory**: Consumption patterns, reorder needs
**Maintenance**: Predictive maintenance data
**Patients**: Flow patterns, length of stay

### Export Data for ML

Use Supabase dashboard to export CSV:
1. Go to Table Editor
2. Select a table
3. Click "..." menu
4. Download as CSV

### Sample ML Use Cases

1. **Predict equipment failures**: Use maintenance_records + equipment data
2. **Optimize inventory**: Use inventory + inventory_transactions
3. **Forecast room demand**: Use rooms + room_assignments + patients
4. **Cost optimization**: Correlate maintenance costs with equipment age

## 📱 Features Overview

### Dashboard
- Real-time stats for all resources
- Status indicators
- Quick overview cards

### Rooms (🛏️)
- Add/Edit/Delete rooms
- Track occupancy
- Monitor features (oxygen, ventilator, monitors)
- Filter by status and type

### Equipment (🔧)
- Manage all medical equipment
- Track location and status
- Schedule maintenance
- Monitor criticality

### Inventory (📦)
- Stock level tracking
- Low stock alerts
- Reorder management
- Category-based organization

### Maintenance (🛠️)
- Log all maintenance tasks
- Priority-based workflow
- Cost tracking
- Vendor management

### Patients (👥)
- Patient registration
- Room assignments
- Medical history
- Emergency contacts

### Analytics (📈)
- Interactive charts
- Status distributions
- Key insights
- Utilization metrics

## 🎨 Customization

### Change Colors
Edit `src/App.css` - look for color codes like #0066cc

### Add New Fields
1. Update Supabase table schema
2. Update corresponding page component
3. Add to formData state

### Modify Permissions
Edit RLS policies in Supabase SQL Editor

## 🚀 Deployment

### Quick Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

Follow prompts, add environment variables when asked.

### Or Deploy to Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Add environment variables
4. Deploy!

## 📞 Need Help?

1. Check console for errors (F12 in browser)
2. Verify all steps completed
3. Review README.md for detailed info
4. Check Supabase logs in dashboard

---

**🎉 Congratulations! Your hospital management system is ready!**

Start by exploring as different user roles to see permission differences.
