import BaseSerializer = require("./base");

declare namespace JSONExtSerializer {

	export interface JSONExtSerializerOptionsCustomType {
		prefix: string;
		check: (v: any, key: string, obj: object) => boolean;
		serialize: (v: any, key: string, obj: object) => any;
		deserialize: (v: any, key: string) => any;
	}
	export interface JSONExtSerializerOptions {
		customs?: JSONExtSerializerOptionsCustomType[];
	}
}


declare class JSONExtSerializer extends BaseSerializer {

	opts: JSONExtSerializer.JSONExtSerializerOptions;

	hasCustomTypes: boolean;

	serialize(obj: any): Buffer;
	deserialize(buf: Buffer|string): any;

}
export = JSONExtSerializer;
