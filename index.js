require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const router = require('./routes/routes');
const cookieParser = require('cookie-parser');

const app = express();

// If running behind proxy (Nginx / Load Balancer)
app.set('trust proxy', true);

// ⭐ FRONTEND URL
// Accept comma-separated FRONTEND_URL env (e.g. "https://prod, http://localhost:5173")
const frontendOriginRaw = process.env.FRONTEND_URL || 'https://numan-mirza.vercel.app';
const frontendOrigins = frontendOriginRaw.split(',').map(s => s.trim()).filter(Boolean);

// ⭐ CORS SETTINGS
// Provide array of allowed origins when multiple are present
// During local development, allow any origin to avoid CORS issues
// Build CORS options with an origin checker to reliably reflect allowed origins
const corsOptions = {
  origin: function (origin, callback) {
    // allow non-browser requests (e.g., curl, server-side)
    if (!origin) return callback(null, true);
    // debug log to help diagnose CORS failures
    console.log('CORS incoming Origin:', origin);
    if (frontendOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
};

app.use(function(req, res, next) {
  // For dev convenience, reflect origin when NODE_ENV !== 'production'
  if (process.env.NODE_ENV !== 'production') res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  next();
});

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Routes
// Quick health check for debugging
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// Mount API router
app.use('/api', router);

// Log mounted API routes (helpful for debugging 404s)
try {
  const routerStack = router.stack || [];
  const routes = [];
  routerStack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      routes.push(`${methods} /api${layer.route.path}`);
    }
  });
  console.log('Mounted API routes:\n', routes.join('\n'));
} catch (e) {
  console.warn('Could not enumerate router routes', e);
}

// PORT FIX ❗
// Always use process.env.PORT first
const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on: http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB Connection Failed', err);
    process.exit(1);
  });
