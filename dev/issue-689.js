const ServiceBroker = require("../").ServiceBroker;

const broker = new ServiceBroker({
	logger : console,
	tracing : {
		enabled : true,
		exporter : {
			type : "Jaeger",
			options : {
				sampler : {
					type : "Const",
					options : {}
				},
				tracerOptions : {},
				defaultTags : null,
				endpoint : "http://localhost:14268/api/traces"
			}
		}
	},
	transporter : "NATS"
});

broker.createService({
	name : "test",
	actions : {
		doTheThing(context) {
			console.log("doing the thing.");
		}
	}
});
broker.start()
	.then(() => broker.call("test.doTheThing"))
	.then(() => {
		// The process only exits if the following line is not commented out.
		// broker.tracer.exporter[0].tracers.test.close();
		broker.stop();
	});
