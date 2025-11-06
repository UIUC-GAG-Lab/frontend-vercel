# Quick Vercel Deployment Checklist

## ✅ **Ready to Deploy Frontend to Vercel**

Your frontend is now configured for Vercel deployment. Here's what you need to do:

### Step 1: Deploy Frontend to Vercel

**Option A: Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd ur2-frontend-code

# Deploy
vercel

# Follow prompts:
# - Project name: ur2-frontend (or your choice)
# - Framework: React
# - Build command: npm run build (auto-detected)
# - Output directory: build (auto-detected)
# - Development command: npm start (auto-detected)
```

**Option B: GitHub Integration**
1. Push ur2-frontend-code to a GitHub repository
2. Go to https://vercel.com and import project
3. Connect GitHub repository
4. Vercel auto-detects settings

### Step 2: Configure Environment Variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables, add:

```bash
# Backend API URL (replace with your backend server)
REACT_APP_API_BASE_URL=https://your-backend-server.com

# Optional: Direct MQTT fallback (if backend config fails)
REACT_APP_MQTT_BROKER=your-broker.hivemq.cloud
REACT_APP_MQTT_USERNAME=your-username
REACT_APP_MQTT_PASSWORD=your-password
```

### Step 3: Deploy Backend Separately

**You'll need to deploy the backend to a VPS/cloud server** (not Vercel):

**Recommended Options:**
- **DigitalOcean Droplet**: $6/month, easy setup
- **AWS EC2**: Free tier available, more complex
- **Railway**: Easy deployment, automatic HTTPS
- **Render**: Similar to Vercel but supports backends

**Quick DigitalOcean Setup:**
```bash
# On your DigitalOcean droplet
git clone your-repo
cd ur2-backend-code
npm install
# Set environment variables
echo "PG_URI=your-postgres-url" > .env
echo "PORT=5000" >> .env
# Start with PM2
npm install -g pm2
pm2 start index.js --name ur2-backend
```

### Step 4: Test the Deployment

1. **Frontend loads**: Visit your Vercel URL
2. **Backend connectivity**: Check browser console for API errors
3. **MQTT connection**: Create a test, verify Pi communication
4. **Database**: Verify tests are saved and retrieved

### Step 5: Update Environment Variables

Once backend is deployed, update Vercel environment variable:
```bash
REACT_APP_API_BASE_URL=https://your-backend-domain.com
```

Then redeploy frontend (Vercel will auto-redeploy on env changes).

## 🔧 **Files Modified for Vercel**

✅ **Added vercel.json** - Vercel configuration
✅ **Added src/config/api.js** - API base URL management  
✅ **Updated all API calls** - Now use configurable API_BASE_URL
✅ **Updated CORS** - Backend allows Vercel domains
✅ **Added health endpoint** - /health for monitoring

## 🌐 **Architecture After Deployment**

```
Users → Vercel (Frontend) → Your Server (Backend) → Database
  ↓                               ↑
MQTT ← HiveMQ Cloud ← Raspberry Pi
```

## 💡 **Quick Test Commands**

```bash
# Test frontend build locally
cd ur2-frontend-code
npm run build
npx serve -s build

# Test backend health
curl https://your-backend.com/health

# Test CORS
curl -H "Origin: https://your-app.vercel.app" https://your-backend.com/runs
```

## 🚨 **Important Notes**

1. **Backend Location**: Vercel is for frontend only. Deploy backend to VPS.
2. **Environment Variables**: Set in Vercel dashboard, not in code.
3. **CORS**: Backend updated to allow Vercel domains.
4. **Database**: Need managed PostgreSQL or VPS-hosted database.

## 🎯 **Simple Deployment Order**

1. Deploy backend to VPS/cloud service
2. Set up database (managed PostgreSQL recommended)  
3. Deploy frontend to Vercel
4. Configure environment variables in Vercel
5. Test complete system

**Total time: ~30 minutes for experienced users, ~2 hours for first-time deployment.**

Your frontend is now **Vercel-ready**! 🚀