import ActionEndpoint = require("./endpoint-action");
import EventEndpoint = require("./endpoint-event");

declare class EndpointList {
	endpoints: (ActionEndpoint | EventEndpoint)[];
}
export = EndpointList;
