const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logger: console,
	transporter: "NATS",
	disableBalancer: true
});

broker.createService({
	name: "test",
	actions: {
		emit(ctx) {
			ctx.emit("this.is.an.event");
		}
	},
	events: {
		"**"(data, sender, eventName){
			if (eventName == "this.is.an.event")
				this.logger.info("event triggered", eventName);
		}
	}
});

broker.createService({
	name: "test2",
	events: {
		"*.is.an.event"(data, sender, eventName){
			if (eventName == "this.is.an.event")
				this.logger.info("event triggered2", eventName);
		}
	}
});

broker.start().then(() => {
	broker.repl();

	return broker.call("test.emit");
});
