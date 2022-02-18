/**
 * Test:
 *
 * 	node bin/moleculer-runner.mjs -e --repl --hot --config examples/esm/moleculer.config.mjs examples/esm/greeter.service.mjs examples/esm/welcome.service.cjs
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
