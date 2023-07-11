import ServiceBroker = require("../service-broker");

declare abstract class Endpoint {
	broker: ServiceBroker;

	id: string;
	node: Record<string, any>;

	local: boolean;
	state: boolean;
}
export = Endpoint;
