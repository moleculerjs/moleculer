import type ServiceBroker = require("../service-broker");

import BaseSerializer = require("./base");

declare class NotepackSerializer extends BaseSerializer {

	init(broker: ServiceBroker): void;

	serialize(obj: any): Buffer;
	deserialize(buf: Buffer|string): any;

}
export = NotepackSerializer;
