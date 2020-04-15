const PRIVATE_CONFIG = require("./private-config.json");

module.exports = {
  apps : [{
    name: 'Schoop Backend',
    script: 'index.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    args: 'one two',
    instances: 5,
    autorestart: true,
    watch: true,
    ignore_watch: ["static", "views"],
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    //instances: -1,
    //instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      DATABASE_CERT_PATH: '/Users/zooza310/ca-certificate.crt',
      SCHOOP_HOST: "http://localhost:3060"
    },
    env_production: {
      NODE_ENV: 'production',
      SCHOOP_PORT: 3000,
      DATABASE_CERT_PATH: `${PRIVATE_CONFIG.server.server_home_path}/ca-certificate.crt`,
      SESSION_SECRET: PRIVATE_CONFIG.server.session_secret
    }
  }]/*,*/

  // deploy : {
  //   production : {
  //     user : 'node',
  //     host : '212.83.163.1',
  //     ref  : 'origin/master',
  //     repo : 'git@github.com:repo.git',
  //     path : '/var/www/production',
  //     'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
  //   }
  // }
};
