const { logActionCalling, logEventEmitting } = require("../../utils");

module.exports = {
	name: "test",

	actions: {
		work: {
			handler(ctx) {
				logActionCalling(this, ctx);
				return true;
			}
		},

		hello: {
			handler(ctx) {
				const { delay = 0, crash = false } = ctx.params;

				if (crash && this.broker.nodeID == "node1")
					return this.broker.stop();

				return this.Promise.delay(delay)
					.then(() => {
						logActionCalling(this, ctx);
						return {
							i: ctx.params.i,
							nodeID: this.broker.nodeID
						};
					});
			}
		}
	},

	events: {
		"sample.event"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
};
