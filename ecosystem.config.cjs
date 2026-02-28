// ecosystem.config.cjs
// PM2 process config for the WhatsApp admin backend running on EC2.
//
// Start:   pm2 start ecosystem.config.cjs
// Logs:    pm2 logs whatsapp-backend
// Status:  pm2 status
// Restart: pm2 restart whatsapp-backend
// Startup: pm2 startup && pm2 save   (auto-start after reboot)

module.exports = {
  apps: [
    {
      name: 'whatsapp-backend',
      script: './server.mjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
