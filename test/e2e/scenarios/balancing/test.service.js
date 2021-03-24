module.exports = {
	name: "test",

	actions: {
		work: {
			handler(ctx) {
				ctx.broadcast("$scenario.action.called", {
					nodeID: this.broker.nodeID,
					action: ctx.action.name,
					params: ctx.params,
					meta: ctx.meta
				});

				return true;
			}
		}
	},

	events: {
		"sample.event"(ctx) {
			ctx.broadcast("$scenario.event.emitted", {
				nodeID: this.broker.nodeID,
				event: ctx.eventName,
				params: ctx.params,
				meta: ctx.meta
			});
		}
	}
};
