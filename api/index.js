import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serverModule = require("../dist/server.cjs");
const app = serverModule.app || serverModule.default || serverModule;

export default function handler(req, res) {
  return app(req, res);
}

