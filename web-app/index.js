/* MAIN FILE */

// Sentry error reporting init
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://b7ca5bed93fc4dd791eff38ce5db1185@sentry.io/4547846' });

const express = require("express");

const PORT = process.env.SCHOOPPORT || 3060;

const app = express();

app.use("/api", require("./app/routes/api")(Sentry));
app.use("/auth", require("./app/routes/auth")(Sentry));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));