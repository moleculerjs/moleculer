module.exports = {
	name: "$scenario",

	created() {
		this.CALLED_ACTIONS = [];
		this.EMITTED_EVENTS = [];
	},

	actions: {
		clear(ctx) {
			this.CALLED_ACTIONS.length = 0;
			this.EMITTED_EVENTS.length = 0;
		},

		getCalledActions(ctx) {
			return this.CALLED_ACTIONS;
		},

		getEmittedEvents(ctx) {
			return this.EMITTED_EVENTS;
		}
	},

	events: {
		"$scenario.action.called"(ctx) {
			this.CALLED_ACTIONS.push(ctx.params);
		},

		"$scenario.event.emitted"(ctx) {
			this.EMITTED_EVENTS.push(ctx.params);
		}
	}
};
