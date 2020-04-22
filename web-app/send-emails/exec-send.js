const Sentry = require('@sentry/node');
const PRIVATE_CONFIG = require("../private-config.json");
const mailgunConfig = PRIVATE_CONFIG.mailgun;
// error reporting
Sentry.init({ dsn: 'https://5412e7c93c7148678b15f5c6e588f60f@o378464.ingest.sentry.io/5205352' });

const emailClient = require("./core/email-client")({ Sentry, mailgunConfig });

