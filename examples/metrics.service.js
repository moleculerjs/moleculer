let _ = require("lodash");

module.exports = function() {
	return {
		name: "metrics",
		
		events: {

			"metrics.context.start"(payload) {
				this.requests[payload.id] = payload;
				payload.spans = [];

				if (payload.parent) {
					let parent = this.requests[payload.parent];
					if (parent)
						parent.spans.push(payload.id);
				}
			},

			"metrics.context.finish"(payload) {
				let item = this.requests[payload.id];
				_.assign(item, payload);

				if (!payload.parent)
					this.printRequest(payload.id);
			}
		},

		methods: {
			printRequest(id) {
				if (!this.logger) return;

				let main = this.requests[id];

				let w = 73;
				let r = _.repeat;
				let gw = 35;
				let maxTitle = w - 2 - 2 - gw - 2 - 1;

				this.logger.debug(["┌", r("─", w-2), "┐"].join(""));

				let printSpanTime = (span) => {
					let time = span.duration.toFixed(2);

					let maxActionName = maxTitle - (span.level-1) * 2 - time.length - 3 - (span.fromCache ? 2 : 0) - (span.remoteCall ? 2 : 0) - (span.error ? 2 : 0);
					let actionName = span.action ? span.action.name : "";
					if (actionName.length > maxActionName) 
						actionName = _.truncate(span.action.name, { length: maxActionName });

					let strAction = [
						r("  ", span.level - 1),
						actionName,
						r(" ", maxActionName - actionName.length + 1),
						span.fromCache ? "* " : "",
						span.remoteCall ? "» " : "",
						span.error ? "× " : "",
						time,
						"ms "
					].join("");

					if (span.startTime == null || span.endTime == null) {
						this.logger.debug(strAction + "! Missing invoke !");
						return;
					}

					let gstart = (span.startTime - main.startTime) / (main.endTime - main.startTime) * 100;
					let gstop = (span.endTime - main.startTime) / (main.endTime - main.startTime) * 100;

					if (_.isNaN(gstart) && _.isNaN(gstop)) {
						gstart = 0;
						gstop = 100;
					}

					let p1 = Math.round(gw * gstart / 100);
					let p2 = Math.round(gw * gstop / 100) - p1;
					let p3 = Math.max(gw - (p1 + p2), 0);

					let gauge = [
						"[",
						r(".", p1),
						r("■", p2),
						r(".", p3),
						"]"
					].join("");

					this.logger.debug("│ " + strAction + gauge + " │");

					if (span.spans.length > 0)
						span.spans.forEach(spanID => printSpanTime(this.requests[spanID]));
				};

				printSpanTime(main);
				this.logger.debug(["└", r("─", w-2), "┘"].join(""));			
			}
		},

		created() {
			this.requests = {};

			this.logger.info("Metrics service created!");
		}
	};
};