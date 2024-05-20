/**
 * Test:
 *
 * 	npx ts-node -T bin\moleculer-runner.js -c examples\runner\moleculer.config.ts -r examples/user.service.js
 */
export default {
	namespace: "bbb",
	logger: true,
	logLevel: "debug",
	//transporter: "TCP"
	hotReload: true,

	created(broker) {
		broker.logger.info("Typescript configuration loaded!");
	}
};
