const Service = require("../../../src/service");

class MyService extends Service {
	constructor(broker, schema) {
		super(broker, schema);
		this.myProp = 123;
	}
}

module.exports = MyService;
