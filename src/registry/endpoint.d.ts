import ServiceBroker = require("../service-broker");

declare class Endpoint {
	broker: ServiceBroker;

	id: string;
	node: Record<string, any>;

	local: boolean;
	state: boolean;
}
export = Endpoint;
