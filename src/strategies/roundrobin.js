
module.exports = class RoundRobinStrategy {

	constructor() {
		this.counter = 0;
	}

	select(list) {
		// Reset counter
		if (this.counter >= list.length) {
			this.counter = 0;
		}
		return list[this.counter++];
	}

};
