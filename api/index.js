import serverApp from "../dist/server.cjs";

const app = serverApp.app || serverApp.default || serverApp;

export default function handler(req, res) {
  return app(req, res);
}
