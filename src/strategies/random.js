const _ = require("lodash");
const BaseStrategy = require("./base");

/**
 * Random strategy class
 *
 * @class RandomStrategy
 */
class RandomStrategy extends BaseStrategy {
	select(list) {
		return list[_.random(0, list.length - 1)];
	}
}

module.exports = RandomStrategy;
