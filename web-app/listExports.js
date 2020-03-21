const ecosystem = require("./ecosystem.config");
const envVars = ecosystem.apps[0].env_production;

console.log(Object.keys(envVars).map(k => `export ${k}=${envVars[k]}`).join(" ; "));
