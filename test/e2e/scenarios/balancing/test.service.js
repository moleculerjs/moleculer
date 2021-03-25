const { logActionCalling, logEventEmitting } = require("../../utils");

module.exports = {
	name: "test",

	actions: {
		work: {
			handler(ctx) {
				logActionCalling(this, ctx);
				return true;
			}
		}
	},

	events: {
		"sample.event"(ctx) {
			logEventEmitting(this, ctx);
		}
	}
};
