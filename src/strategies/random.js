
const _ = require("lodash");

module.exports = class RandomStrategy {
	select(list) {
		return list[_.random(0, list.length - 1)];
	}
};
