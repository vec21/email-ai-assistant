module.exports = {
  apps: [
    {
      name: 'postmark-webhook',
      script: './server.js',
      cwd: '/home/ubuntu/assistente-virtual-backup1/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'rag-api',
      script: './main.py',
      cwd: '/home/ubuntu/assistente-virtual-backup1',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        PYTHONPATH: '/home/ubuntu/assistente-virtual-backup1',
        PATH: '/home/ubuntu/Ragvenv/bin:' + process.env.PATH
      }
    }
  ]
};
