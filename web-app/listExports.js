const ecosystem = require("./ecosystem.config");
const envVars = ecosystem.apps[0][process.argv[2] || "env"];

console.log(Object.keys(envVars).map(k => `export ${k}=${envVars[k]}`).join(" ; "));
