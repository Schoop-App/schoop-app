const Sentry = require("@sentry/node");
const mysql = require("mysql");
const fs = require("fs");
const PRIVATE_CONFIG = require("../private-config.json");
// error reporting
Sentry.init({
  dsn: "https://5412e7c93c7148678b15f5c6e588f60f@o378464.ingest.sentry.io/5205352",
});

const dbConn = mysql.createConnection({
  host: PRIVATE_CONFIG.database.host,
  user: PRIVATE_CONFIG.database.user,
  password: PRIVATE_CONFIG.database.password,
  database: PRIVATE_CONFIG.database.database,
  port: PRIVATE_CONFIG.database.port,
  ssl: {
    ca: fs.readFileSync(
      process.env.DATABASE_CERT_PATH || "/Users/zooza310/ca-certificate.crt"
    ),
  },
});

// change this to delete other user IDs
const USERS_TO_DELETE = [
  "100144626692249443669",
  "103472255531875647711",
  "103569929075229946514",
  "107903430249289326354",
  "111251006322923560310",
  "111371637901362416963",
  "113035750889186248375",
];

dbConn.connect(async (err) => {
  if (err) throw err;

  const db = require("../app/core/db")({ Sentry, dbConn });

  for (const studentId of USERS_TO_DELETE) {
    console.log(`Deleting user with ID ${studentId}...`);
    try {
      await db.deleteAccount(studentId);
      console.log(`Deleted ${studentId}`);
    } catch (e) {
      console.log(`Unable to delete ${studentId}`);
    }
  }

  dbConn.end();
});
