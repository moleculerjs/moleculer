const ServiceBroker = require("../src/service-broker");
const fs = require("fs");

const broker = new ServiceBroker();

broker.createService({
	name: "service-creator",
	actions: {
		createService(ctx) {
			return this.broker.createService({
				name: `${ctx.params.name}-${ctx.params.id}`
			});
		}
	},
	events: {
		hello(ctx) {}
	}
});

broker.start().then(() => {
	broker.repl();

	let id = 1;
	setInterval(() => {
		broker
			.call("service-creator.createService", { name: "Service", id: id++ })
			.then(res => {
				broker.logger.info(res.name);
				return res;
			})
			.then(async res => broker.destroyService(res))
			.then(() => {
				broker.logger.info(
					`broker.registry.nodes.localNode.services.length: ${broker.registry.nodes.localNode.services.length}`
				);
				broker.logger.info(
					`broker.registry.actions.actions.length: ${broker.registry.actions.actions.size}`
				);
				broker.logger.info(
					`broker.registry.events.events.length: ${broker.registry.events.events.size}`
				);
				broker.logger.info(`broker.services.length: ${broker.services.length}`);

				// fs.writeFileSync(
				// 	"./nodeInfo.json",
				// 	JSON.stringify(broker.registry.getLocalNodeInfo(), null, 2)
				// );
			})
			.catch(err => broker.logger.error(err.message));
	}, 1000);
});
