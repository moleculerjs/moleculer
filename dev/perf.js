let ServiceBroker = require("../src/service-broker");
const broker = new ServiceBroker({
	logger: console
});

broker.createService({
	name: "math",
	actions: {
		add({ params }) {
			return params.a + params.b;
		}
	}
});

let c = 0;
function work() {
	c++;
	broker
		.call("math.add", { a: 5, b: 3 })
		.then(() => setImmediate(work))
		.catch(broker.logger.error);
}

broker
	.start()
	.then(() => {
		let startTime = Date.now();
		setInterval(() => {
			let rps = c / ((Date.now() - startTime) / 1000);
			broker.logger.info(Number(rps.toFixed(0)).toLocaleString(), "req/s");
			c = 0;
			startTime = Date.now();
		}, 1000);
	})
	.then(() => work());
