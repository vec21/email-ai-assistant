module.exports = {
  apps: [
    {
      name: 'rag-api',
      script: 'main.py',
      interpreter: 'python3',
      cwd: '/home/ubuntu/assistente-virtual-backup1/backend/rag',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'postmark-webhook',
      script: 'server.js',
      cwd: '/home/ubuntu/assistente-virtual-backup1/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
