import BaseSerializer = require("./base");

declare namespace CborSerializer {
	export interface CborSerializerOptions {
		useRecords?: boolean;
		useTag259ForMaps?: boolean;
	}
}

declare class CborSerializer extends BaseSerializer {
	opts: CborSerializer.CborSerializerOptions;

	serialize(obj: any): Buffer;
	deserialize(buf: Buffer | string): any;
}
export = CborSerializer;
