const Context = require("../../src/context");

class MyContext extends Context {
	constructor(opts) {
		super(opts);
		this.myProp = "a";
	}
}

module.exports = MyContext;