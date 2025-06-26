// Simple production server starter
process.env.NODE_ENV = 'production';

console.log('🚀 Starting FunnelHQ 360 in PRODUCTION mode');
console.log('Environment:', process.env.NODE_ENV);
console.log('Supabase URL:', process.env.VITE_SUPABASE_URL ? 'Configured' : 'Missing');
console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing');

// Import and start the server
import('./server/index.ts');