import BaseSerializer = require("./base");

declare class JSONSerializer extends BaseSerializer {
	serialize(obj: any): Buffer;
	deserialize(buf: Buffer | string): any;
}
export = JSONSerializer;
