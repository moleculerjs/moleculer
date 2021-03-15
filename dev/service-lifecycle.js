"use strict";

const kleur = require("kleur");
const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logger: console
});

broker.createService({
	name: "first",
	dependencies: ["second"],
	async started() {
		this.logger.info("Call add...");
		try {
			const res = await this.broker.call("second.add", { a: 5, b: 4 });
			this.logger.info(kleur.green().bold(`Res: ${res}`));
		} catch(err) {
			this.logger.error(kleur.red().bold(err.message));
		}
	}
});

broker.createService({
	name: "second",
	actions: {
		add(ctx) {
			this.logger.info("Do add...");
			return this.calc(ctx.params.a, ctx.params.b);
		}
	},

	async started() {
		this.logger.info(kleur.yellow().bold(`Starting '${this.name}' service...`));
		await this.Promise.delay(2 * 1000);
		this.calc = (a, b) => Number(a) + Number(b);

		this.logger.info(kleur.yellow().bold(`Started '${this.name}' service.`));
	}
});

broker.start().then(() => {
	broker.repl();
});
