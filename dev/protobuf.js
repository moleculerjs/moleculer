const crypto = require("crypto");
const _ = require("lodash");
const kleur = require("kleur");

const ServiceBroker = require("../src/service-broker");
const E = require("../src/errors");
const RetryMiddleware = require("../src/middlewares/retry");

const transporter = "NATS";
const serializer = "Avro";

const broker1 = new ServiceBroker({ nodeID: "broker1", transporter, serializer });
const broker2 = new ServiceBroker({ nodeID: "broker2", transporter, serializer });

broker2.createService({
	name: "echo",
	actions: {
		reply: {
			handler(ctx) {
				this.logger.info("Received:",  ctx.params.length);
				return ctx.params;
			}
		},
	}
});

let params = Buffer.from(crypto.randomBytes(1 * 1000));
//params = { a: 5, b: "John" };
//params = null;

broker1.start()
	.then(() => broker2.start())
	.then(() => broker1.repl())
	.then(() => broker1.Promise.delay(1000))
	.then(() => {
		return broker1.call("echo.reply", params);
	})
	.then(res => {
		//broker1.logger.info("Received back: ", res.length);
		if (Buffer.compare(params, res) == 0) {
		//if (_.isEqual(params, res)) {
			broker1.logger.info(kleur.green().bold("EQUALS"));
		} else {
			broker1.logger.info(kleur.red().bold("NOT EQUALS"));
		}
	})
	.catch(err => broker1.logger.error(err.message));
