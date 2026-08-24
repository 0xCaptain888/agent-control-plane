import { loadApiConfig } from "./config.js";
import { createApiServer } from "./server.js";

const config = loadApiConfig();
const server = createApiServer(config);
server.listen(config.port, config.host, () => console.log(`AgentGuard API listening on http://${config.host}:${config.port}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
