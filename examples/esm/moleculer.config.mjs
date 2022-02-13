/**
 * Test:
 *
 * 	node bin/moleculer-runner.mjs -e --config examples/esm/moleculer.config.mjs examples/esm/greeter.service.mjs
 */
export default {
	namespace: "bbb",
	logger: true,
	logLevel: "debug",
	//transporter: "TCP"
	hotReload: true,

	created(broker) {
		broker.logger.info("ESM Config loaded!");
	}
};
