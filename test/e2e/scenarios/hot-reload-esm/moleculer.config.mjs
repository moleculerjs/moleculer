// Configuration loaded by the moleculer-runner-mjs started from start.sh.
// The runner picks up TRANSPORTER / NAMESPACE / SERIALIZER from env so
// the e2e scenario.js can talk to it via the same TCP transporter.
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let transporter = process.env.TRANSPORTER || "TCP";
if (transporter == "Kafka") transporter = "kafka://localhost:9093";

export default {
	namespace: process.env.NAMESPACE,
	nodeID: "runner",
	logLevel: process.env.LOGLEVEL || "warn",
	transporter,
	serializer: process.env.SERIALIZER || "JSON",
	hotReload: true,

	created(broker) {
		// The e2e helper service listens for `$shutdown` events so the
		// scenario can stop the runner cleanly.
		broker.loadService(path.resolve(__dirname, "../../services/helper.service.js"));
	}
};
