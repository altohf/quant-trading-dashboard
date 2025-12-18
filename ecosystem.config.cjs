module.exports = {
  apps: [
    {
      name: 'quant-dashboard',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/quant-dashboard-error.log',
      out_file: '/var/log/pm2/quant-dashboard-out.log',
      log_file: '/var/log/pm2/quant-dashboard-combined.log',
      time: true,
    },
  ],
};
