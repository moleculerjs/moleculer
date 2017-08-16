
/**
 * Base strategy class
 *
 * @class BaseStrategy
 */
class BaseStrategy {

	constructor() {
		this.broker = null;
	}

	init(broker) {
		this.broker = broker;
	}

	select(/*list*/) {
		/* istanbul ignore next */
		throw new Error("Not implemented method!");
	}

	getBroker() {
		return this.broker;
	}

}

module.exports = BaseStrategy;
