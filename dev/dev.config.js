"use strict";

/*
	To test run:

		node bin/moleculer-runner.js --config dev/dev.config.js --repl

	Call the service and you will see middleware messages in console

		mol $ call test.hello

*/

const myMiddleware = {
	localAction: handler => async ctx => {
		ctx.broker.logger.warn(">> MW1-before (from config)");
		const res = await handler(ctx);
		ctx.broker.logger.warn("<< MW1-after (from config)");
		return res;
	}
};

module.exports = {
	namespace: "config-test",
	transporter: "TCP",
	logger: true,
	logLevel: "debug",

	middlewares: [myMiddleware],

	created(broker) {
		broker.logger.warn("--- Broker created (from config)!");
	},

	started(broker) {
		broker.logger.warn("--- Broker started (from config)!");

		broker.createService({
			name: "test",
			actions: {
				hello(ctx) {
					return "Hello";
				}
			}
		});

		return broker.Promise.delay(2000).then(() => broker.call("$node.list"));
	},

	stopped(broker) {
		return broker.Promise.delay(2000).then(() => broker.logger.warn("--- Broker stopped"));
	},
	replOptions: {
		customCommands: [
			{
				command: "hello <name>",
				description: "Call the greeter.hello service with name",
				alias: "hi",
				options: [{ option: "-u, --uppercase", description: "Uppercase the name" }],
				types: {
					string: ["name"],
					boolean: ["u", "uppercase"]
				},
				//parse(command, args) {},
				//validate(args) {},
				//help(args) {},
				allowUnknownOptions: true,
				action(broker, args) {
					const name = args.options.uppercase ? args.name.toUpperCase() : args.name;
					return broker.call("greeter.hello", { name }).then(console.log);
				}
			}
		]
	}
};
