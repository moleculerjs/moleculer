const ServiceBroker = require("../src/service-broker");
const Service = require("../src/service");

const broker = new ServiceBroker({ logLevel: "warn" });

// Add custom merge logic for "foobar" schema
// property as static method of Service.
Service.mergeSchemaFoobar = function (src, target) {
	return [src, target].join("-");
};

broker.createService({
	name: "greeter",
	mixins: [
		{
			foobar: "Bar"
		}
	],

	foobar: "Foo",

	started() {
		this.logger.warn("Foobar:", this.schema.foobar);
		// Print: "Foo-Bar"
	}
});

broker.start();
