/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

/* istanbul ignore next */
$root.packets = (function() {

	/**
     * Namespace packets.
     * @exports packets
     * @namespace
     */
	var packets = {};

	/**
     * DataType enum.
     * @name packets.DataType
     * @enum {string}
     * @property {number} DATATYPE_UNDEFINED=0 DATATYPE_UNDEFINED value
     * @property {number} DATATYPE_NULL=1 DATATYPE_NULL value
     * @property {number} DATATYPE_JSON=2 DATATYPE_JSON value
     * @property {number} DATATYPE_BUFFER=3 DATATYPE_BUFFER value
     */
	packets.DataType = (function() {
		var valuesById = {}, values = Object.create(valuesById);
		values[valuesById[0] = "DATATYPE_UNDEFINED"] = 0;
		values[valuesById[1] = "DATATYPE_NULL"] = 1;
		values[valuesById[2] = "DATATYPE_JSON"] = 2;
		values[valuesById[3] = "DATATYPE_BUFFER"] = 3;
		return values;
	})();

	packets.PacketEvent = (function() {

		/**
         * Properties of a PacketEvent.
         * @memberof packets
         * @interface IPacketEvent
         * @property {string} ver PacketEvent ver
         * @property {string} sender PacketEvent sender
         * @property {string} id PacketEvent id
         * @property {string} event PacketEvent event
         * @property {Uint8Array|null} [data] PacketEvent data
         * @property {packets.DataType} dataType PacketEvent dataType
         * @property {Array.<string>|null} [groups] PacketEvent groups
         * @property {boolean} broadcast PacketEvent broadcast
         * @property {string} meta PacketEvent meta
         * @property {number} level PacketEvent level
         * @property {boolean|null} [tracing] PacketEvent tracing
         * @property {string|null} [parentID] PacketEvent parentID
         * @property {string|null} [requestID] PacketEvent requestID
         * @property {boolean|null} [stream] PacketEvent stream
         * @property {number|null} [seq] PacketEvent seq
         * @property {string|null} [caller] PacketEvent caller
         * @property {boolean} needAck PacketEvent needAck
         */

		/**
         * Constructs a new PacketEvent.
         * @memberof packets
         * @classdesc Represents a PacketEvent.
         * @implements IPacketEvent
         * @constructor
         * @param {packets.IPacketEvent=} [properties] Properties to set
         */
		function PacketEvent(properties) {
			this.groups = [];
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketEvent ver.
         * @member {string} ver
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.ver = "";

		/**
         * PacketEvent sender.
         * @member {string} sender
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.sender = "";

		/**
         * PacketEvent id.
         * @member {string} id
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.id = "";

		/**
         * PacketEvent event.
         * @member {string} event
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.event = "";

		/**
         * PacketEvent data.
         * @member {Uint8Array} data
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.data = $util.newBuffer([]);

		/**
         * PacketEvent dataType.
         * @member {packets.DataType} dataType
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.dataType = 0;

		/**
         * PacketEvent groups.
         * @member {Array.<string>} groups
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.groups = $util.emptyArray;

		/**
         * PacketEvent broadcast.
         * @member {boolean} broadcast
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.broadcast = false;

		/**
         * PacketEvent meta.
         * @member {string} meta
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.meta = "";

		/**
         * PacketEvent level.
         * @member {number} level
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.level = 0;

		/**
         * PacketEvent tracing.
         * @member {boolean} tracing
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.tracing = false;

		/**
         * PacketEvent parentID.
         * @member {string} parentID
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.parentID = "";

		/**
         * PacketEvent requestID.
         * @member {string} requestID
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.requestID = "";

		/**
         * PacketEvent stream.
         * @member {boolean} stream
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.stream = false;

		/**
         * PacketEvent seq.
         * @member {number} seq
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.seq = 0;

		/**
         * PacketEvent caller.
         * @member {string} caller
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.caller = "";

		/**
         * PacketEvent needAck.
         * @member {boolean} needAck
         * @memberof packets.PacketEvent
         * @instance
         */
		PacketEvent.prototype.needAck = false;

		/**
         * Creates a new PacketEvent instance using the specified properties.
         * @function create
         * @memberof packets.PacketEvent
         * @static
         * @param {packets.IPacketEvent=} [properties] Properties to set
         * @returns {packets.PacketEvent} PacketEvent instance
         */
		PacketEvent.create = function create(properties) {
			return new PacketEvent(properties);
		};

		/**
         * Encodes the specified PacketEvent message. Does not implicitly {@link packets.PacketEvent.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketEvent
         * @static
         * @param {packets.IPacketEvent} message PacketEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketEvent.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 2 =*/26).string(message.id);
			writer.uint32(/* id 4, wireType 2 =*/34).string(message.event);
			if (message.data != null && message.hasOwnProperty("data"))
				writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.data);
			writer.uint32(/* id 6, wireType 0 =*/48).int32(message.dataType);
			if (message.groups != null && message.groups.length)
				for (var i = 0; i < message.groups.length; ++i)
					writer.uint32(/* id 7, wireType 2 =*/58).string(message.groups[i]);
			writer.uint32(/* id 8, wireType 0 =*/64).bool(message.broadcast);
			writer.uint32(/* id 9, wireType 2 =*/74).string(message.meta);
			writer.uint32(/* id 10, wireType 0 =*/80).int32(message.level);
			if (message.tracing != null && message.hasOwnProperty("tracing"))
				writer.uint32(/* id 11, wireType 0 =*/88).bool(message.tracing);
			if (message.parentID != null && message.hasOwnProperty("parentID"))
				writer.uint32(/* id 12, wireType 2 =*/98).string(message.parentID);
			if (message.requestID != null && message.hasOwnProperty("requestID"))
				writer.uint32(/* id 13, wireType 2 =*/106).string(message.requestID);
			if (message.stream != null && message.hasOwnProperty("stream"))
				writer.uint32(/* id 14, wireType 0 =*/112).bool(message.stream);
			if (message.seq != null && message.hasOwnProperty("seq"))
				writer.uint32(/* id 15, wireType 0 =*/120).int32(message.seq);
			if (message.caller != null && message.hasOwnProperty("caller"))
				writer.uint32(/* id 16, wireType 2 =*/130).string(message.caller);
			writer.uint32(/* id 17, wireType 0 =*/136).bool(message.needAck);
			return writer;
		};

		/**
         * Encodes the specified PacketEvent message, length delimited. Does not implicitly {@link packets.PacketEvent.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketEvent
         * @static
         * @param {packets.IPacketEvent} message PacketEvent message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketEvent.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketEvent message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketEvent} PacketEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketEvent.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketEvent();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.id = reader.string();
						break;
					case 4:
						message.event = reader.string();
						break;
					case 5:
						message.data = reader.bytes();
						break;
					case 6:
						message.dataType = reader.int32();
						break;
					case 7:
						if (!(message.groups && message.groups.length))
							message.groups = [];
						message.groups.push(reader.string());
						break;
					case 8:
						message.broadcast = reader.bool();
						break;
					case 9:
						message.meta = reader.string();
						break;
					case 10:
						message.level = reader.int32();
						break;
					case 11:
						message.tracing = reader.bool();
						break;
					case 12:
						message.parentID = reader.string();
						break;
					case 13:
						message.requestID = reader.string();
						break;
					case 14:
						message.stream = reader.bool();
						break;
					case 15:
						message.seq = reader.int32();
						break;
					case 16:
						message.caller = reader.string();
						break;
					case 17:
						message.needAck = reader.bool();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("id"))
				throw $util.ProtocolError("missing required 'id'", { instance: message });
			if (!message.hasOwnProperty("event"))
				throw $util.ProtocolError("missing required 'event'", { instance: message });
			if (!message.hasOwnProperty("dataType"))
				throw $util.ProtocolError("missing required 'dataType'", { instance: message });
			if (!message.hasOwnProperty("broadcast"))
				throw $util.ProtocolError("missing required 'broadcast'", { instance: message });
			if (!message.hasOwnProperty("meta"))
				throw $util.ProtocolError("missing required 'meta'", { instance: message });
			if (!message.hasOwnProperty("level"))
				throw $util.ProtocolError("missing required 'level'", { instance: message });
			if (!message.hasOwnProperty("needAck"))
				throw $util.ProtocolError("missing required 'needAck'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketEvent message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketEvent
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketEvent} PacketEvent
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketEvent.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketEvent message.
         * @function verify
         * @memberof packets.PacketEvent
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketEvent.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isString(message.id))
				return "id: string expected";
			if (!$util.isString(message.event))
				return "event: string expected";
			if (message.data != null && message.hasOwnProperty("data"))
				if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
					return "data: buffer expected";
			switch (message.dataType) {
				default:
					return "dataType: enum value expected";
				case 0:
				case 1:
				case 2:
				case 3:
					break;
			}
			if (message.groups != null && message.hasOwnProperty("groups")) {
				if (!Array.isArray(message.groups))
					return "groups: array expected";
				for (var i = 0; i < message.groups.length; ++i)
					if (!$util.isString(message.groups[i]))
						return "groups: string[] expected";
			}
			if (typeof message.broadcast !== "boolean")
				return "broadcast: boolean expected";
			if (!$util.isString(message.meta))
				return "meta: string expected";
			if (!$util.isInteger(message.level))
				return "level: integer expected";
			if (message.tracing != null && message.hasOwnProperty("tracing"))
				if (typeof message.tracing !== "boolean")
					return "tracing: boolean expected";
			if (message.parentID != null && message.hasOwnProperty("parentID"))
				if (!$util.isString(message.parentID))
					return "parentID: string expected";
			if (message.requestID != null && message.hasOwnProperty("requestID"))
				if (!$util.isString(message.requestID))
					return "requestID: string expected";
			if (message.stream != null && message.hasOwnProperty("stream"))
				if (typeof message.stream !== "boolean")
					return "stream: boolean expected";
			if (message.seq != null && message.hasOwnProperty("seq"))
				if (!$util.isInteger(message.seq))
					return "seq: integer expected";
			if (message.caller != null && message.hasOwnProperty("caller"))
				if (!$util.isString(message.caller))
					return "caller: string expected";
			if (typeof message.needAck !== "boolean")
				return "needAck: boolean expected";
			return null;
		};

		/**
         * Creates a PacketEvent message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketEvent
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketEvent} PacketEvent
         */
		PacketEvent.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketEvent)
				return object;
			var message = new $root.packets.PacketEvent();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.id != null)
				message.id = String(object.id);
			if (object.event != null)
				message.event = String(object.event);
			if (object.data != null)
				if (typeof object.data === "string")
					$util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
				else if (object.data.length)
					message.data = object.data;
			switch (object.dataType) {
				case "DATATYPE_UNDEFINED":
				case 0:
					message.dataType = 0;
					break;
				case "DATATYPE_NULL":
				case 1:
					message.dataType = 1;
					break;
				case "DATATYPE_JSON":
				case 2:
					message.dataType = 2;
					break;
				case "DATATYPE_BUFFER":
				case 3:
					message.dataType = 3;
					break;
			}
			if (object.groups) {
				if (!Array.isArray(object.groups))
					throw TypeError(".packets.PacketEvent.groups: array expected");
				message.groups = [];
				for (var i = 0; i < object.groups.length; ++i)
					message.groups[i] = String(object.groups[i]);
			}
			if (object.broadcast != null)
				message.broadcast = Boolean(object.broadcast);
			if (object.meta != null)
				message.meta = String(object.meta);
			if (object.level != null)
				message.level = object.level | 0;
			if (object.tracing != null)
				message.tracing = Boolean(object.tracing);
			if (object.parentID != null)
				message.parentID = String(object.parentID);
			if (object.requestID != null)
				message.requestID = String(object.requestID);
			if (object.stream != null)
				message.stream = Boolean(object.stream);
			if (object.seq != null)
				message.seq = object.seq | 0;
			if (object.caller != null)
				message.caller = String(object.caller);
			if (object.needAck != null)
				message.needAck = Boolean(object.needAck);
			return message;
		};

		/**
         * Creates a plain object from a PacketEvent message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketEvent
         * @static
         * @param {packets.PacketEvent} message PacketEvent
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketEvent.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.arrays || options.defaults)
				object.groups = [];
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.id = "";
				object.event = "";
				if (options.bytes === String)
					object.data = "";
				else {
					object.data = [];
					if (options.bytes !== Array)
						object.data = $util.newBuffer(object.data);
				}
				object.dataType = options.enums === String ? "DATATYPE_UNDEFINED" : 0;
				object.broadcast = false;
				object.meta = "";
				object.level = 0;
				object.tracing = false;
				object.parentID = "";
				object.requestID = "";
				object.stream = false;
				object.seq = 0;
				object.caller = "";
				object.needAck = false;
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.id != null && message.hasOwnProperty("id"))
				object.id = message.id;
			if (message.event != null && message.hasOwnProperty("event"))
				object.event = message.event;
			if (message.data != null && message.hasOwnProperty("data"))
				object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
			if (message.dataType != null && message.hasOwnProperty("dataType"))
				object.dataType = options.enums === String ? $root.packets.DataType[message.dataType] : message.dataType;
			if (message.groups && message.groups.length) {
				object.groups = [];
				for (var j = 0; j < message.groups.length; ++j)
					object.groups[j] = message.groups[j];
			}
			if (message.broadcast != null && message.hasOwnProperty("broadcast"))
				object.broadcast = message.broadcast;
			if (message.meta != null && message.hasOwnProperty("meta"))
				object.meta = message.meta;
			if (message.level != null && message.hasOwnProperty("level"))
				object.level = message.level;
			if (message.tracing != null && message.hasOwnProperty("tracing"))
				object.tracing = message.tracing;
			if (message.parentID != null && message.hasOwnProperty("parentID"))
				object.parentID = message.parentID;
			if (message.requestID != null && message.hasOwnProperty("requestID"))
				object.requestID = message.requestID;
			if (message.stream != null && message.hasOwnProperty("stream"))
				object.stream = message.stream;
			if (message.seq != null && message.hasOwnProperty("seq"))
				object.seq = message.seq;
			if (message.caller != null && message.hasOwnProperty("caller"))
				object.caller = message.caller;
			if (message.needAck != null && message.hasOwnProperty("needAck"))
				object.needAck = message.needAck;
			return object;
		};

		/**
         * Converts this PacketEvent to JSON.
         * @function toJSON
         * @memberof packets.PacketEvent
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketEvent.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketEvent;
	})();

	packets.PacketRequest = (function() {

		/**
         * Properties of a PacketRequest.
         * @memberof packets
         * @interface IPacketRequest
         * @property {string} ver PacketRequest ver
         * @property {string} sender PacketRequest sender
         * @property {string} id PacketRequest id
         * @property {string} action PacketRequest action
         * @property {Uint8Array|null} [params] PacketRequest params
         * @property {packets.DataType} paramsType PacketRequest paramsType
         * @property {string} meta PacketRequest meta
         * @property {number} timeout PacketRequest timeout
         * @property {number} level PacketRequest level
         * @property {boolean|null} [tracing] PacketRequest tracing
         * @property {string|null} [parentID] PacketRequest parentID
         * @property {string|null} [requestID] PacketRequest requestID
         * @property {boolean|null} [stream] PacketRequest stream
         * @property {number|null} [seq] PacketRequest seq
         * @property {string|null} [caller] PacketRequest caller
         */

		/**
         * Constructs a new PacketRequest.
         * @memberof packets
         * @classdesc Represents a PacketRequest.
         * @implements IPacketRequest
         * @constructor
         * @param {packets.IPacketRequest=} [properties] Properties to set
         */
		function PacketRequest(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketRequest ver.
         * @member {string} ver
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.ver = "";

		/**
         * PacketRequest sender.
         * @member {string} sender
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.sender = "";

		/**
         * PacketRequest id.
         * @member {string} id
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.id = "";

		/**
         * PacketRequest action.
         * @member {string} action
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.action = "";

		/**
         * PacketRequest params.
         * @member {Uint8Array} params
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.params = $util.newBuffer([]);

		/**
         * PacketRequest paramsType.
         * @member {packets.DataType} paramsType
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.paramsType = 0;

		/**
         * PacketRequest meta.
         * @member {string} meta
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.meta = "";

		/**
         * PacketRequest timeout.
         * @member {number} timeout
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.timeout = 0;

		/**
         * PacketRequest level.
         * @member {number} level
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.level = 0;

		/**
         * PacketRequest tracing.
         * @member {boolean} tracing
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.tracing = false;

		/**
         * PacketRequest parentID.
         * @member {string} parentID
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.parentID = "";

		/**
         * PacketRequest requestID.
         * @member {string} requestID
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.requestID = "";

		/**
         * PacketRequest stream.
         * @member {boolean} stream
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.stream = false;

		/**
         * PacketRequest seq.
         * @member {number} seq
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.seq = 0;

		/**
         * PacketRequest caller.
         * @member {string} caller
         * @memberof packets.PacketRequest
         * @instance
         */
		PacketRequest.prototype.caller = "";

		/**
         * Creates a new PacketRequest instance using the specified properties.
         * @function create
         * @memberof packets.PacketRequest
         * @static
         * @param {packets.IPacketRequest=} [properties] Properties to set
         * @returns {packets.PacketRequest} PacketRequest instance
         */
		PacketRequest.create = function create(properties) {
			return new PacketRequest(properties);
		};

		/**
         * Encodes the specified PacketRequest message. Does not implicitly {@link packets.PacketRequest.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketRequest
         * @static
         * @param {packets.IPacketRequest} message PacketRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketRequest.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 2 =*/26).string(message.id);
			writer.uint32(/* id 4, wireType 2 =*/34).string(message.action);
			if (message.params != null && message.hasOwnProperty("params"))
				writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.params);
			writer.uint32(/* id 6, wireType 0 =*/48).int32(message.paramsType);
			writer.uint32(/* id 7, wireType 2 =*/58).string(message.meta);
			writer.uint32(/* id 8, wireType 1 =*/65).double(message.timeout);
			writer.uint32(/* id 9, wireType 0 =*/72).int32(message.level);
			if (message.tracing != null && message.hasOwnProperty("tracing"))
				writer.uint32(/* id 10, wireType 0 =*/80).bool(message.tracing);
			if (message.parentID != null && message.hasOwnProperty("parentID"))
				writer.uint32(/* id 11, wireType 2 =*/90).string(message.parentID);
			if (message.requestID != null && message.hasOwnProperty("requestID"))
				writer.uint32(/* id 12, wireType 2 =*/98).string(message.requestID);
			if (message.stream != null && message.hasOwnProperty("stream"))
				writer.uint32(/* id 13, wireType 0 =*/104).bool(message.stream);
			if (message.seq != null && message.hasOwnProperty("seq"))
				writer.uint32(/* id 14, wireType 0 =*/112).int32(message.seq);
			if (message.caller != null && message.hasOwnProperty("caller"))
				writer.uint32(/* id 15, wireType 2 =*/122).string(message.caller);
			return writer;
		};

		/**
         * Encodes the specified PacketRequest message, length delimited. Does not implicitly {@link packets.PacketRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketRequest
         * @static
         * @param {packets.IPacketRequest} message PacketRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketRequest.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketRequest message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketRequest} PacketRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketRequest.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketRequest();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.id = reader.string();
						break;
					case 4:
						message.action = reader.string();
						break;
					case 5:
						message.params = reader.bytes();
						break;
					case 6:
						message.paramsType = reader.int32();
						break;
					case 7:
						message.meta = reader.string();
						break;
					case 8:
						message.timeout = reader.double();
						break;
					case 9:
						message.level = reader.int32();
						break;
					case 10:
						message.tracing = reader.bool();
						break;
					case 11:
						message.parentID = reader.string();
						break;
					case 12:
						message.requestID = reader.string();
						break;
					case 13:
						message.stream = reader.bool();
						break;
					case 14:
						message.seq = reader.int32();
						break;
					case 15:
						message.caller = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("id"))
				throw $util.ProtocolError("missing required 'id'", { instance: message });
			if (!message.hasOwnProperty("action"))
				throw $util.ProtocolError("missing required 'action'", { instance: message });
			if (!message.hasOwnProperty("paramsType"))
				throw $util.ProtocolError("missing required 'paramsType'", { instance: message });
			if (!message.hasOwnProperty("meta"))
				throw $util.ProtocolError("missing required 'meta'", { instance: message });
			if (!message.hasOwnProperty("timeout"))
				throw $util.ProtocolError("missing required 'timeout'", { instance: message });
			if (!message.hasOwnProperty("level"))
				throw $util.ProtocolError("missing required 'level'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketRequest} PacketRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketRequest.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketRequest message.
         * @function verify
         * @memberof packets.PacketRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketRequest.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isString(message.id))
				return "id: string expected";
			if (!$util.isString(message.action))
				return "action: string expected";
			if (message.params != null && message.hasOwnProperty("params"))
				if (!(message.params && typeof message.params.length === "number" || $util.isString(message.params)))
					return "params: buffer expected";
			switch (message.paramsType) {
				default:
					return "paramsType: enum value expected";
				case 0:
				case 1:
				case 2:
				case 3:
					break;
			}
			if (!$util.isString(message.meta))
				return "meta: string expected";
			if (typeof message.timeout !== "number")
				return "timeout: number expected";
			if (!$util.isInteger(message.level))
				return "level: integer expected";
			if (message.tracing != null && message.hasOwnProperty("tracing"))
				if (typeof message.tracing !== "boolean")
					return "tracing: boolean expected";
			if (message.parentID != null && message.hasOwnProperty("parentID"))
				if (!$util.isString(message.parentID))
					return "parentID: string expected";
			if (message.requestID != null && message.hasOwnProperty("requestID"))
				if (!$util.isString(message.requestID))
					return "requestID: string expected";
			if (message.stream != null && message.hasOwnProperty("stream"))
				if (typeof message.stream !== "boolean")
					return "stream: boolean expected";
			if (message.seq != null && message.hasOwnProperty("seq"))
				if (!$util.isInteger(message.seq))
					return "seq: integer expected";
			if (message.caller != null && message.hasOwnProperty("caller"))
				if (!$util.isString(message.caller))
					return "caller: string expected";
			return null;
		};

		/**
         * Creates a PacketRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketRequest} PacketRequest
         */
		PacketRequest.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketRequest)
				return object;
			var message = new $root.packets.PacketRequest();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.id != null)
				message.id = String(object.id);
			if (object.action != null)
				message.action = String(object.action);
			if (object.params != null)
				if (typeof object.params === "string")
					$util.base64.decode(object.params, message.params = $util.newBuffer($util.base64.length(object.params)), 0);
				else if (object.params.length)
					message.params = object.params;
			switch (object.paramsType) {
				case "DATATYPE_UNDEFINED":
				case 0:
					message.paramsType = 0;
					break;
				case "DATATYPE_NULL":
				case 1:
					message.paramsType = 1;
					break;
				case "DATATYPE_JSON":
				case 2:
					message.paramsType = 2;
					break;
				case "DATATYPE_BUFFER":
				case 3:
					message.paramsType = 3;
					break;
			}
			if (object.meta != null)
				message.meta = String(object.meta);
			if (object.timeout != null)
				message.timeout = Number(object.timeout);
			if (object.level != null)
				message.level = object.level | 0;
			if (object.tracing != null)
				message.tracing = Boolean(object.tracing);
			if (object.parentID != null)
				message.parentID = String(object.parentID);
			if (object.requestID != null)
				message.requestID = String(object.requestID);
			if (object.stream != null)
				message.stream = Boolean(object.stream);
			if (object.seq != null)
				message.seq = object.seq | 0;
			if (object.caller != null)
				message.caller = String(object.caller);
			return message;
		};

		/**
         * Creates a plain object from a PacketRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketRequest
         * @static
         * @param {packets.PacketRequest} message PacketRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketRequest.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.id = "";
				object.action = "";
				if (options.bytes === String)
					object.params = "";
				else {
					object.params = [];
					if (options.bytes !== Array)
						object.params = $util.newBuffer(object.params);
				}
				object.paramsType = options.enums === String ? "DATATYPE_UNDEFINED" : 0;
				object.meta = "";
				object.timeout = 0;
				object.level = 0;
				object.tracing = false;
				object.parentID = "";
				object.requestID = "";
				object.stream = false;
				object.seq = 0;
				object.caller = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.id != null && message.hasOwnProperty("id"))
				object.id = message.id;
			if (message.action != null && message.hasOwnProperty("action"))
				object.action = message.action;
			if (message.params != null && message.hasOwnProperty("params"))
				object.params = options.bytes === String ? $util.base64.encode(message.params, 0, message.params.length) : options.bytes === Array ? Array.prototype.slice.call(message.params) : message.params;
			if (message.paramsType != null && message.hasOwnProperty("paramsType"))
				object.paramsType = options.enums === String ? $root.packets.DataType[message.paramsType] : message.paramsType;
			if (message.meta != null && message.hasOwnProperty("meta"))
				object.meta = message.meta;
			if (message.timeout != null && message.hasOwnProperty("timeout"))
				object.timeout = options.json && !isFinite(message.timeout) ? String(message.timeout) : message.timeout;
			if (message.level != null && message.hasOwnProperty("level"))
				object.level = message.level;
			if (message.tracing != null && message.hasOwnProperty("tracing"))
				object.tracing = message.tracing;
			if (message.parentID != null && message.hasOwnProperty("parentID"))
				object.parentID = message.parentID;
			if (message.requestID != null && message.hasOwnProperty("requestID"))
				object.requestID = message.requestID;
			if (message.stream != null && message.hasOwnProperty("stream"))
				object.stream = message.stream;
			if (message.seq != null && message.hasOwnProperty("seq"))
				object.seq = message.seq;
			if (message.caller != null && message.hasOwnProperty("caller"))
				object.caller = message.caller;
			return object;
		};

		/**
         * Converts this PacketRequest to JSON.
         * @function toJSON
         * @memberof packets.PacketRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketRequest.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketRequest;
	})();

	packets.PacketResponse = (function() {

		/**
         * Properties of a PacketResponse.
         * @memberof packets
         * @interface IPacketResponse
         * @property {string} ver PacketResponse ver
         * @property {string} sender PacketResponse sender
         * @property {string} id PacketResponse id
         * @property {boolean} success PacketResponse success
         * @property {Uint8Array|null} [data] PacketResponse data
         * @property {packets.DataType} dataType PacketResponse dataType
         * @property {string|null} [error] PacketResponse error
         * @property {string} meta PacketResponse meta
         * @property {boolean|null} [stream] PacketResponse stream
         * @property {number|null} [seq] PacketResponse seq
         */

		/**
         * Constructs a new PacketResponse.
         * @memberof packets
         * @classdesc Represents a PacketResponse.
         * @implements IPacketResponse
         * @constructor
         * @param {packets.IPacketResponse=} [properties] Properties to set
         */
		function PacketResponse(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketResponse ver.
         * @member {string} ver
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.ver = "";

		/**
         * PacketResponse sender.
         * @member {string} sender
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.sender = "";

		/**
         * PacketResponse id.
         * @member {string} id
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.id = "";

		/**
         * PacketResponse success.
         * @member {boolean} success
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.success = false;

		/**
         * PacketResponse data.
         * @member {Uint8Array} data
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.data = $util.newBuffer([]);

		/**
         * PacketResponse dataType.
         * @member {packets.DataType} dataType
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.dataType = 0;

		/**
         * PacketResponse error.
         * @member {string} error
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.error = "";

		/**
         * PacketResponse meta.
         * @member {string} meta
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.meta = "";

		/**
         * PacketResponse stream.
         * @member {boolean} stream
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.stream = false;

		/**
         * PacketResponse seq.
         * @member {number} seq
         * @memberof packets.PacketResponse
         * @instance
         */
		PacketResponse.prototype.seq = 0;

		/**
         * Creates a new PacketResponse instance using the specified properties.
         * @function create
         * @memberof packets.PacketResponse
         * @static
         * @param {packets.IPacketResponse=} [properties] Properties to set
         * @returns {packets.PacketResponse} PacketResponse instance
         */
		PacketResponse.create = function create(properties) {
			return new PacketResponse(properties);
		};

		/**
         * Encodes the specified PacketResponse message. Does not implicitly {@link packets.PacketResponse.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketResponse
         * @static
         * @param {packets.IPacketResponse} message PacketResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketResponse.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 2 =*/26).string(message.id);
			writer.uint32(/* id 4, wireType 0 =*/32).bool(message.success);
			if (message.data != null && message.hasOwnProperty("data"))
				writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.data);
			writer.uint32(/* id 6, wireType 0 =*/48).int32(message.dataType);
			if (message.error != null && message.hasOwnProperty("error"))
				writer.uint32(/* id 7, wireType 2 =*/58).string(message.error);
			writer.uint32(/* id 8, wireType 2 =*/66).string(message.meta);
			if (message.stream != null && message.hasOwnProperty("stream"))
				writer.uint32(/* id 9, wireType 0 =*/72).bool(message.stream);
			if (message.seq != null && message.hasOwnProperty("seq"))
				writer.uint32(/* id 10, wireType 0 =*/80).int32(message.seq);
			return writer;
		};

		/**
         * Encodes the specified PacketResponse message, length delimited. Does not implicitly {@link packets.PacketResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketResponse
         * @static
         * @param {packets.IPacketResponse} message PacketResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketResponse.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketResponse message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketResponse} PacketResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketResponse.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketResponse();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.id = reader.string();
						break;
					case 4:
						message.success = reader.bool();
						break;
					case 5:
						message.data = reader.bytes();
						break;
					case 6:
						message.dataType = reader.int32();
						break;
					case 7:
						message.error = reader.string();
						break;
					case 8:
						message.meta = reader.string();
						break;
					case 9:
						message.stream = reader.bool();
						break;
					case 10:
						message.seq = reader.int32();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("id"))
				throw $util.ProtocolError("missing required 'id'", { instance: message });
			if (!message.hasOwnProperty("success"))
				throw $util.ProtocolError("missing required 'success'", { instance: message });
			if (!message.hasOwnProperty("dataType"))
				throw $util.ProtocolError("missing required 'dataType'", { instance: message });
			if (!message.hasOwnProperty("meta"))
				throw $util.ProtocolError("missing required 'meta'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketResponse} PacketResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketResponse.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketResponse message.
         * @function verify
         * @memberof packets.PacketResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketResponse.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isString(message.id))
				return "id: string expected";
			if (typeof message.success !== "boolean")
				return "success: boolean expected";
			if (message.data != null && message.hasOwnProperty("data"))
				if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
					return "data: buffer expected";
			switch (message.dataType) {
				default:
					return "dataType: enum value expected";
				case 0:
				case 1:
				case 2:
				case 3:
					break;
			}
			if (message.error != null && message.hasOwnProperty("error"))
				if (!$util.isString(message.error))
					return "error: string expected";
			if (!$util.isString(message.meta))
				return "meta: string expected";
			if (message.stream != null && message.hasOwnProperty("stream"))
				if (typeof message.stream !== "boolean")
					return "stream: boolean expected";
			if (message.seq != null && message.hasOwnProperty("seq"))
				if (!$util.isInteger(message.seq))
					return "seq: integer expected";
			return null;
		};

		/**
         * Creates a PacketResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketResponse} PacketResponse
         */
		PacketResponse.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketResponse)
				return object;
			var message = new $root.packets.PacketResponse();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.id != null)
				message.id = String(object.id);
			if (object.success != null)
				message.success = Boolean(object.success);
			if (object.data != null)
				if (typeof object.data === "string")
					$util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
				else if (object.data.length)
					message.data = object.data;
			switch (object.dataType) {
				case "DATATYPE_UNDEFINED":
				case 0:
					message.dataType = 0;
					break;
				case "DATATYPE_NULL":
				case 1:
					message.dataType = 1;
					break;
				case "DATATYPE_JSON":
				case 2:
					message.dataType = 2;
					break;
				case "DATATYPE_BUFFER":
				case 3:
					message.dataType = 3;
					break;
			}
			if (object.error != null)
				message.error = String(object.error);
			if (object.meta != null)
				message.meta = String(object.meta);
			if (object.stream != null)
				message.stream = Boolean(object.stream);
			if (object.seq != null)
				message.seq = object.seq | 0;
			return message;
		};

		/**
         * Creates a plain object from a PacketResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketResponse
         * @static
         * @param {packets.PacketResponse} message PacketResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketResponse.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.id = "";
				object.success = false;
				if (options.bytes === String)
					object.data = "";
				else {
					object.data = [];
					if (options.bytes !== Array)
						object.data = $util.newBuffer(object.data);
				}
				object.dataType = options.enums === String ? "DATATYPE_UNDEFINED" : 0;
				object.error = "";
				object.meta = "";
				object.stream = false;
				object.seq = 0;
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.id != null && message.hasOwnProperty("id"))
				object.id = message.id;
			if (message.success != null && message.hasOwnProperty("success"))
				object.success = message.success;
			if (message.data != null && message.hasOwnProperty("data"))
				object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
			if (message.dataType != null && message.hasOwnProperty("dataType"))
				object.dataType = options.enums === String ? $root.packets.DataType[message.dataType] : message.dataType;
			if (message.error != null && message.hasOwnProperty("error"))
				object.error = message.error;
			if (message.meta != null && message.hasOwnProperty("meta"))
				object.meta = message.meta;
			if (message.stream != null && message.hasOwnProperty("stream"))
				object.stream = message.stream;
			if (message.seq != null && message.hasOwnProperty("seq"))
				object.seq = message.seq;
			return object;
		};

		/**
         * Converts this PacketResponse to JSON.
         * @function toJSON
         * @memberof packets.PacketResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketResponse.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketResponse;
	})();

	packets.PacketDiscover = (function() {

		/**
         * Properties of a PacketDiscover.
         * @memberof packets
         * @interface IPacketDiscover
         * @property {string} ver PacketDiscover ver
         * @property {string} sender PacketDiscover sender
         */

		/**
         * Constructs a new PacketDiscover.
         * @memberof packets
         * @classdesc Represents a PacketDiscover.
         * @implements IPacketDiscover
         * @constructor
         * @param {packets.IPacketDiscover=} [properties] Properties to set
         */
		function PacketDiscover(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketDiscover ver.
         * @member {string} ver
         * @memberof packets.PacketDiscover
         * @instance
         */
		PacketDiscover.prototype.ver = "";

		/**
         * PacketDiscover sender.
         * @member {string} sender
         * @memberof packets.PacketDiscover
         * @instance
         */
		PacketDiscover.prototype.sender = "";

		/**
         * Creates a new PacketDiscover instance using the specified properties.
         * @function create
         * @memberof packets.PacketDiscover
         * @static
         * @param {packets.IPacketDiscover=} [properties] Properties to set
         * @returns {packets.PacketDiscover} PacketDiscover instance
         */
		PacketDiscover.create = function create(properties) {
			return new PacketDiscover(properties);
		};

		/**
         * Encodes the specified PacketDiscover message. Does not implicitly {@link packets.PacketDiscover.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketDiscover
         * @static
         * @param {packets.IPacketDiscover} message PacketDiscover message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketDiscover.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			return writer;
		};

		/**
         * Encodes the specified PacketDiscover message, length delimited. Does not implicitly {@link packets.PacketDiscover.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketDiscover
         * @static
         * @param {packets.IPacketDiscover} message PacketDiscover message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketDiscover.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketDiscover message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketDiscover
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketDiscover} PacketDiscover
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketDiscover.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketDiscover();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketDiscover message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketDiscover
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketDiscover} PacketDiscover
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketDiscover.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketDiscover message.
         * @function verify
         * @memberof packets.PacketDiscover
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketDiscover.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			return null;
		};

		/**
         * Creates a PacketDiscover message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketDiscover
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketDiscover} PacketDiscover
         */
		PacketDiscover.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketDiscover)
				return object;
			var message = new $root.packets.PacketDiscover();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			return message;
		};

		/**
         * Creates a plain object from a PacketDiscover message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketDiscover
         * @static
         * @param {packets.PacketDiscover} message PacketDiscover
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketDiscover.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			return object;
		};

		/**
         * Converts this PacketDiscover to JSON.
         * @function toJSON
         * @memberof packets.PacketDiscover
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketDiscover.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketDiscover;
	})();

	packets.PacketInfo = (function() {

		/**
         * Properties of a PacketInfo.
         * @memberof packets
         * @interface IPacketInfo
         * @property {string} ver PacketInfo ver
         * @property {string} sender PacketInfo sender
         * @property {string} services PacketInfo services
         * @property {string} config PacketInfo config
         * @property {Array.<string>|null} [ipList] PacketInfo ipList
         * @property {string} hostname PacketInfo hostname
         * @property {packets.PacketInfo.IClient} client PacketInfo client
         * @property {number} seq PacketInfo seq
         * @property {string} instanceID PacketInfo instanceID
         * @property {string} metadata PacketInfo metadata
         */

		/**
         * Constructs a new PacketInfo.
         * @memberof packets
         * @classdesc Represents a PacketInfo.
         * @implements IPacketInfo
         * @constructor
         * @param {packets.IPacketInfo=} [properties] Properties to set
         */
		function PacketInfo(properties) {
			this.ipList = [];
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketInfo ver.
         * @member {string} ver
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.ver = "";

		/**
         * PacketInfo sender.
         * @member {string} sender
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.sender = "";

		/**
         * PacketInfo services.
         * @member {string} services
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.services = "";

		/**
         * PacketInfo config.
         * @member {string} config
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.config = "";

		/**
         * PacketInfo ipList.
         * @member {Array.<string>} ipList
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.ipList = $util.emptyArray;

		/**
         * PacketInfo hostname.
         * @member {string} hostname
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.hostname = "";

		/**
         * PacketInfo client.
         * @member {packets.PacketInfo.IClient} client
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.client = null;

		/**
         * PacketInfo seq.
         * @member {number} seq
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.seq = 0;

		/**
         * PacketInfo instanceID.
         * @member {string} instanceID
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.instanceID = "";

		/**
         * PacketInfo metadata.
         * @member {string} metadata
         * @memberof packets.PacketInfo
         * @instance
         */
		PacketInfo.prototype.metadata = "";

		/**
         * Creates a new PacketInfo instance using the specified properties.
         * @function create
         * @memberof packets.PacketInfo
         * @static
         * @param {packets.IPacketInfo=} [properties] Properties to set
         * @returns {packets.PacketInfo} PacketInfo instance
         */
		PacketInfo.create = function create(properties) {
			return new PacketInfo(properties);
		};

		/**
         * Encodes the specified PacketInfo message. Does not implicitly {@link packets.PacketInfo.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketInfo
         * @static
         * @param {packets.IPacketInfo} message PacketInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketInfo.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 2 =*/26).string(message.services);
			writer.uint32(/* id 4, wireType 2 =*/34).string(message.config);
			if (message.ipList != null && message.ipList.length)
				for (var i = 0; i < message.ipList.length; ++i)
					writer.uint32(/* id 5, wireType 2 =*/42).string(message.ipList[i]);
			writer.uint32(/* id 6, wireType 2 =*/50).string(message.hostname);
			$root.packets.PacketInfo.Client.encode(message.client, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
			writer.uint32(/* id 8, wireType 0 =*/64).int32(message.seq);
			writer.uint32(/* id 9, wireType 2 =*/74).string(message.instanceID);
			writer.uint32(/* id 10, wireType 2 =*/82).string(message.metadata);
			return writer;
		};

		/**
         * Encodes the specified PacketInfo message, length delimited. Does not implicitly {@link packets.PacketInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketInfo
         * @static
         * @param {packets.IPacketInfo} message PacketInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketInfo.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketInfo message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketInfo} PacketInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketInfo.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketInfo();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.services = reader.string();
						break;
					case 4:
						message.config = reader.string();
						break;
					case 5:
						if (!(message.ipList && message.ipList.length))
							message.ipList = [];
						message.ipList.push(reader.string());
						break;
					case 6:
						message.hostname = reader.string();
						break;
					case 7:
						message.client = $root.packets.PacketInfo.Client.decode(reader, reader.uint32());
						break;
					case 8:
						message.seq = reader.int32();
						break;
					case 9:
						message.instanceID = reader.string();
						break;
					case 10:
						message.metadata = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("services"))
				throw $util.ProtocolError("missing required 'services'", { instance: message });
			if (!message.hasOwnProperty("config"))
				throw $util.ProtocolError("missing required 'config'", { instance: message });
			if (!message.hasOwnProperty("hostname"))
				throw $util.ProtocolError("missing required 'hostname'", { instance: message });
			if (!message.hasOwnProperty("client"))
				throw $util.ProtocolError("missing required 'client'", { instance: message });
			if (!message.hasOwnProperty("seq"))
				throw $util.ProtocolError("missing required 'seq'", { instance: message });
			if (!message.hasOwnProperty("instanceID"))
				throw $util.ProtocolError("missing required 'instanceID'", { instance: message });
			if (!message.hasOwnProperty("metadata"))
				throw $util.ProtocolError("missing required 'metadata'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketInfo} PacketInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketInfo.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketInfo message.
         * @function verify
         * @memberof packets.PacketInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketInfo.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isString(message.services))
				return "services: string expected";
			if (!$util.isString(message.config))
				return "config: string expected";
			if (message.ipList != null && message.hasOwnProperty("ipList")) {
				if (!Array.isArray(message.ipList))
					return "ipList: array expected";
				for (var i = 0; i < message.ipList.length; ++i)
					if (!$util.isString(message.ipList[i]))
						return "ipList: string[] expected";
			}
			if (!$util.isString(message.hostname))
				return "hostname: string expected";
			{
				var error = $root.packets.PacketInfo.Client.verify(message.client);
				if (error)
					return "client." + error;
			}
			if (!$util.isInteger(message.seq))
				return "seq: integer expected";
			if (!$util.isString(message.instanceID))
				return "instanceID: string expected";
			if (!$util.isString(message.metadata))
				return "metadata: string expected";
			return null;
		};

		/**
         * Creates a PacketInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketInfo} PacketInfo
         */
		PacketInfo.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketInfo)
				return object;
			var message = new $root.packets.PacketInfo();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.services != null)
				message.services = String(object.services);
			if (object.config != null)
				message.config = String(object.config);
			if (object.ipList) {
				if (!Array.isArray(object.ipList))
					throw TypeError(".packets.PacketInfo.ipList: array expected");
				message.ipList = [];
				for (var i = 0; i < object.ipList.length; ++i)
					message.ipList[i] = String(object.ipList[i]);
			}
			if (object.hostname != null)
				message.hostname = String(object.hostname);
			if (object.client != null) {
				if (typeof object.client !== "object")
					throw TypeError(".packets.PacketInfo.client: object expected");
				message.client = $root.packets.PacketInfo.Client.fromObject(object.client);
			}
			if (object.seq != null)
				message.seq = object.seq | 0;
			if (object.instanceID != null)
				message.instanceID = String(object.instanceID);
			if (object.metadata != null)
				message.metadata = String(object.metadata);
			return message;
		};

		/**
         * Creates a plain object from a PacketInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketInfo
         * @static
         * @param {packets.PacketInfo} message PacketInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketInfo.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.arrays || options.defaults)
				object.ipList = [];
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.services = "";
				object.config = "";
				object.hostname = "";
				object.client = null;
				object.seq = 0;
				object.instanceID = "";
				object.metadata = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.services != null && message.hasOwnProperty("services"))
				object.services = message.services;
			if (message.config != null && message.hasOwnProperty("config"))
				object.config = message.config;
			if (message.ipList && message.ipList.length) {
				object.ipList = [];
				for (var j = 0; j < message.ipList.length; ++j)
					object.ipList[j] = message.ipList[j];
			}
			if (message.hostname != null && message.hasOwnProperty("hostname"))
				object.hostname = message.hostname;
			if (message.client != null && message.hasOwnProperty("client"))
				object.client = $root.packets.PacketInfo.Client.toObject(message.client, options);
			if (message.seq != null && message.hasOwnProperty("seq"))
				object.seq = message.seq;
			if (message.instanceID != null && message.hasOwnProperty("instanceID"))
				object.instanceID = message.instanceID;
			if (message.metadata != null && message.hasOwnProperty("metadata"))
				object.metadata = message.metadata;
			return object;
		};

		/**
         * Converts this PacketInfo to JSON.
         * @function toJSON
         * @memberof packets.PacketInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketInfo.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		PacketInfo.Client = (function() {

			/**
             * Properties of a Client.
             * @memberof packets.PacketInfo
             * @interface IClient
             * @property {string} type Client type
             * @property {string} version Client version
             * @property {string} langVersion Client langVersion
             */

			/**
             * Constructs a new Client.
             * @memberof packets.PacketInfo
             * @classdesc Represents a Client.
             * @implements IClient
             * @constructor
             * @param {packets.PacketInfo.IClient=} [properties] Properties to set
             */
			function Client(properties) {
				if (properties)
					for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
						if (properties[keys[i]] != null)
							this[keys[i]] = properties[keys[i]];
			}

			/**
             * Client type.
             * @member {string} type
             * @memberof packets.PacketInfo.Client
             * @instance
             */
			Client.prototype.type = "";

			/**
             * Client version.
             * @member {string} version
             * @memberof packets.PacketInfo.Client
             * @instance
             */
			Client.prototype.version = "";

			/**
             * Client langVersion.
             * @member {string} langVersion
             * @memberof packets.PacketInfo.Client
             * @instance
             */
			Client.prototype.langVersion = "";

			/**
             * Creates a new Client instance using the specified properties.
             * @function create
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {packets.PacketInfo.IClient=} [properties] Properties to set
             * @returns {packets.PacketInfo.Client} Client instance
             */
			Client.create = function create(properties) {
				return new Client(properties);
			};

			/**
             * Encodes the specified Client message. Does not implicitly {@link packets.PacketInfo.Client.verify|verify} messages.
             * @function encode
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {packets.PacketInfo.IClient} message Client message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
			Client.encode = function encode(message, writer) {
				if (!writer)
					writer = $Writer.create();
				writer.uint32(/* id 1, wireType 2 =*/10).string(message.type);
				writer.uint32(/* id 2, wireType 2 =*/18).string(message.version);
				writer.uint32(/* id 3, wireType 2 =*/26).string(message.langVersion);
				return writer;
			};

			/**
             * Encodes the specified Client message, length delimited. Does not implicitly {@link packets.PacketInfo.Client.verify|verify} messages.
             * @function encodeDelimited
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {packets.PacketInfo.IClient} message Client message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
			Client.encodeDelimited = function encodeDelimited(message, writer) {
				return this.encode(message, writer).ldelim();
			};

			/**
             * Decodes a Client message from the specified reader or buffer.
             * @function decode
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {packets.PacketInfo.Client} Client
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
			Client.decode = function decode(reader, length) {
				if (!(reader instanceof $Reader))
					reader = $Reader.create(reader);
				var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketInfo.Client();
				while (reader.pos < end) {
					var tag = reader.uint32();
					switch (tag >>> 3) {
						case 1:
							message.type = reader.string();
							break;
						case 2:
							message.version = reader.string();
							break;
						case 3:
							message.langVersion = reader.string();
							break;
						default:
							reader.skipType(tag & 7);
							break;
					}
				}
				if (!message.hasOwnProperty("type"))
					throw $util.ProtocolError("missing required 'type'", { instance: message });
				if (!message.hasOwnProperty("version"))
					throw $util.ProtocolError("missing required 'version'", { instance: message });
				if (!message.hasOwnProperty("langVersion"))
					throw $util.ProtocolError("missing required 'langVersion'", { instance: message });
				return message;
			};

			/**
             * Decodes a Client message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {packets.PacketInfo.Client} Client
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
			Client.decodeDelimited = function decodeDelimited(reader) {
				if (!(reader instanceof $Reader))
					reader = new $Reader(reader);
				return this.decode(reader, reader.uint32());
			};

			/**
             * Verifies a Client message.
             * @function verify
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
			Client.verify = function verify(message) {
				if (typeof message !== "object" || message === null)
					return "object expected";
				if (!$util.isString(message.type))
					return "type: string expected";
				if (!$util.isString(message.version))
					return "version: string expected";
				if (!$util.isString(message.langVersion))
					return "langVersion: string expected";
				return null;
			};

			/**
             * Creates a Client message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {packets.PacketInfo.Client} Client
             */
			Client.fromObject = function fromObject(object) {
				if (object instanceof $root.packets.PacketInfo.Client)
					return object;
				var message = new $root.packets.PacketInfo.Client();
				if (object.type != null)
					message.type = String(object.type);
				if (object.version != null)
					message.version = String(object.version);
				if (object.langVersion != null)
					message.langVersion = String(object.langVersion);
				return message;
			};

			/**
             * Creates a plain object from a Client message. Also converts values to other types if specified.
             * @function toObject
             * @memberof packets.PacketInfo.Client
             * @static
             * @param {packets.PacketInfo.Client} message Client
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
			Client.toObject = function toObject(message, options) {
				if (!options)
					options = {};
				var object = {};
				if (options.defaults) {
					object.type = "";
					object.version = "";
					object.langVersion = "";
				}
				if (message.type != null && message.hasOwnProperty("type"))
					object.type = message.type;
				if (message.version != null && message.hasOwnProperty("version"))
					object.version = message.version;
				if (message.langVersion != null && message.hasOwnProperty("langVersion"))
					object.langVersion = message.langVersion;
				return object;
			};

			/**
             * Converts this Client to JSON.
             * @function toJSON
             * @memberof packets.PacketInfo.Client
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
			Client.prototype.toJSON = function toJSON() {
				return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
			};

			return Client;
		})();

		return PacketInfo;
	})();

	packets.PacketDisconnect = (function() {

		/**
         * Properties of a PacketDisconnect.
         * @memberof packets
         * @interface IPacketDisconnect
         * @property {string} ver PacketDisconnect ver
         * @property {string} sender PacketDisconnect sender
         */

		/**
         * Constructs a new PacketDisconnect.
         * @memberof packets
         * @classdesc Represents a PacketDisconnect.
         * @implements IPacketDisconnect
         * @constructor
         * @param {packets.IPacketDisconnect=} [properties] Properties to set
         */
		function PacketDisconnect(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketDisconnect ver.
         * @member {string} ver
         * @memberof packets.PacketDisconnect
         * @instance
         */
		PacketDisconnect.prototype.ver = "";

		/**
         * PacketDisconnect sender.
         * @member {string} sender
         * @memberof packets.PacketDisconnect
         * @instance
         */
		PacketDisconnect.prototype.sender = "";

		/**
         * Creates a new PacketDisconnect instance using the specified properties.
         * @function create
         * @memberof packets.PacketDisconnect
         * @static
         * @param {packets.IPacketDisconnect=} [properties] Properties to set
         * @returns {packets.PacketDisconnect} PacketDisconnect instance
         */
		PacketDisconnect.create = function create(properties) {
			return new PacketDisconnect(properties);
		};

		/**
         * Encodes the specified PacketDisconnect message. Does not implicitly {@link packets.PacketDisconnect.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketDisconnect
         * @static
         * @param {packets.IPacketDisconnect} message PacketDisconnect message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketDisconnect.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			return writer;
		};

		/**
         * Encodes the specified PacketDisconnect message, length delimited. Does not implicitly {@link packets.PacketDisconnect.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketDisconnect
         * @static
         * @param {packets.IPacketDisconnect} message PacketDisconnect message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketDisconnect.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketDisconnect message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketDisconnect
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketDisconnect} PacketDisconnect
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketDisconnect.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketDisconnect();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketDisconnect message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketDisconnect
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketDisconnect} PacketDisconnect
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketDisconnect.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketDisconnect message.
         * @function verify
         * @memberof packets.PacketDisconnect
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketDisconnect.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			return null;
		};

		/**
         * Creates a PacketDisconnect message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketDisconnect
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketDisconnect} PacketDisconnect
         */
		PacketDisconnect.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketDisconnect)
				return object;
			var message = new $root.packets.PacketDisconnect();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			return message;
		};

		/**
         * Creates a plain object from a PacketDisconnect message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketDisconnect
         * @static
         * @param {packets.PacketDisconnect} message PacketDisconnect
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketDisconnect.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			return object;
		};

		/**
         * Converts this PacketDisconnect to JSON.
         * @function toJSON
         * @memberof packets.PacketDisconnect
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketDisconnect.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketDisconnect;
	})();

	packets.PacketHeartbeat = (function() {

		/**
         * Properties of a PacketHeartbeat.
         * @memberof packets
         * @interface IPacketHeartbeat
         * @property {string} ver PacketHeartbeat ver
         * @property {string} sender PacketHeartbeat sender
         * @property {number} cpu PacketHeartbeat cpu
         */

		/**
         * Constructs a new PacketHeartbeat.
         * @memberof packets
         * @classdesc Represents a PacketHeartbeat.
         * @implements IPacketHeartbeat
         * @constructor
         * @param {packets.IPacketHeartbeat=} [properties] Properties to set
         */
		function PacketHeartbeat(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketHeartbeat ver.
         * @member {string} ver
         * @memberof packets.PacketHeartbeat
         * @instance
         */
		PacketHeartbeat.prototype.ver = "";

		/**
         * PacketHeartbeat sender.
         * @member {string} sender
         * @memberof packets.PacketHeartbeat
         * @instance
         */
		PacketHeartbeat.prototype.sender = "";

		/**
         * PacketHeartbeat cpu.
         * @member {number} cpu
         * @memberof packets.PacketHeartbeat
         * @instance
         */
		PacketHeartbeat.prototype.cpu = 0;

		/**
         * Creates a new PacketHeartbeat instance using the specified properties.
         * @function create
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {packets.IPacketHeartbeat=} [properties] Properties to set
         * @returns {packets.PacketHeartbeat} PacketHeartbeat instance
         */
		PacketHeartbeat.create = function create(properties) {
			return new PacketHeartbeat(properties);
		};

		/**
         * Encodes the specified PacketHeartbeat message. Does not implicitly {@link packets.PacketHeartbeat.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {packets.IPacketHeartbeat} message PacketHeartbeat message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketHeartbeat.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 1 =*/25).double(message.cpu);
			return writer;
		};

		/**
         * Encodes the specified PacketHeartbeat message, length delimited. Does not implicitly {@link packets.PacketHeartbeat.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {packets.IPacketHeartbeat} message PacketHeartbeat message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketHeartbeat.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketHeartbeat message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketHeartbeat} PacketHeartbeat
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketHeartbeat.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketHeartbeat();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.cpu = reader.double();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("cpu"))
				throw $util.ProtocolError("missing required 'cpu'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketHeartbeat message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketHeartbeat} PacketHeartbeat
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketHeartbeat.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketHeartbeat message.
         * @function verify
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketHeartbeat.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (typeof message.cpu !== "number")
				return "cpu: number expected";
			return null;
		};

		/**
         * Creates a PacketHeartbeat message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketHeartbeat} PacketHeartbeat
         */
		PacketHeartbeat.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketHeartbeat)
				return object;
			var message = new $root.packets.PacketHeartbeat();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.cpu != null)
				message.cpu = Number(object.cpu);
			return message;
		};

		/**
         * Creates a plain object from a PacketHeartbeat message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketHeartbeat
         * @static
         * @param {packets.PacketHeartbeat} message PacketHeartbeat
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketHeartbeat.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.cpu = 0;
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.cpu != null && message.hasOwnProperty("cpu"))
				object.cpu = options.json && !isFinite(message.cpu) ? String(message.cpu) : message.cpu;
			return object;
		};

		/**
         * Converts this PacketHeartbeat to JSON.
         * @function toJSON
         * @memberof packets.PacketHeartbeat
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketHeartbeat.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketHeartbeat;
	})();

	packets.PacketPing = (function() {

		/**
         * Properties of a PacketPing.
         * @memberof packets
         * @interface IPacketPing
         * @property {string} ver PacketPing ver
         * @property {string} sender PacketPing sender
         * @property {number|Long} time PacketPing time
         * @property {string|null} [id] PacketPing id
         */

		/**
         * Constructs a new PacketPing.
         * @memberof packets
         * @classdesc Represents a PacketPing.
         * @implements IPacketPing
         * @constructor
         * @param {packets.IPacketPing=} [properties] Properties to set
         */
		function PacketPing(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketPing ver.
         * @member {string} ver
         * @memberof packets.PacketPing
         * @instance
         */
		PacketPing.prototype.ver = "";

		/**
         * PacketPing sender.
         * @member {string} sender
         * @memberof packets.PacketPing
         * @instance
         */
		PacketPing.prototype.sender = "";

		/**
         * PacketPing time.
         * @member {number|Long} time
         * @memberof packets.PacketPing
         * @instance
         */
		PacketPing.prototype.time = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

		/**
         * PacketPing id.
         * @member {string} id
         * @memberof packets.PacketPing
         * @instance
         */
		PacketPing.prototype.id = "";

		/**
         * Creates a new PacketPing instance using the specified properties.
         * @function create
         * @memberof packets.PacketPing
         * @static
         * @param {packets.IPacketPing=} [properties] Properties to set
         * @returns {packets.PacketPing} PacketPing instance
         */
		PacketPing.create = function create(properties) {
			return new PacketPing(properties);
		};

		/**
         * Encodes the specified PacketPing message. Does not implicitly {@link packets.PacketPing.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketPing
         * @static
         * @param {packets.IPacketPing} message PacketPing message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketPing.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 0 =*/24).int64(message.time);
			if (message.id != null && message.hasOwnProperty("id"))
				writer.uint32(/* id 4, wireType 2 =*/34).string(message.id);
			return writer;
		};

		/**
         * Encodes the specified PacketPing message, length delimited. Does not implicitly {@link packets.PacketPing.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketPing
         * @static
         * @param {packets.IPacketPing} message PacketPing message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketPing.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketPing message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketPing
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketPing} PacketPing
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketPing.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketPing();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.time = reader.int64();
						break;
					case 4:
						message.id = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("time"))
				throw $util.ProtocolError("missing required 'time'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketPing message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketPing
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketPing} PacketPing
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketPing.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketPing message.
         * @function verify
         * @memberof packets.PacketPing
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketPing.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isInteger(message.time) && !(message.time && $util.isInteger(message.time.low) && $util.isInteger(message.time.high)))
				return "time: integer|Long expected";
			if (message.id != null && message.hasOwnProperty("id"))
				if (!$util.isString(message.id))
					return "id: string expected";
			return null;
		};

		/**
         * Creates a PacketPing message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketPing
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketPing} PacketPing
         */
		PacketPing.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketPing)
				return object;
			var message = new $root.packets.PacketPing();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.time != null)
				if ($util.Long)
					(message.time = $util.Long.fromValue(object.time)).unsigned = false;
				else if (typeof object.time === "string")
					message.time = parseInt(object.time, 10);
				else if (typeof object.time === "number")
					message.time = object.time;
				else if (typeof object.time === "object")
					message.time = new $util.LongBits(object.time.low >>> 0, object.time.high >>> 0).toNumber();
			if (object.id != null)
				message.id = String(object.id);
			return message;
		};

		/**
         * Creates a plain object from a PacketPing message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketPing
         * @static
         * @param {packets.PacketPing} message PacketPing
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketPing.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				if ($util.Long) {
					var long = new $util.Long(0, 0, false);
					object.time = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
				} else
					object.time = options.longs === String ? "0" : 0;
				object.id = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.time != null && message.hasOwnProperty("time"))
				if (typeof message.time === "number")
					object.time = options.longs === String ? String(message.time) : message.time;
				else
					object.time = options.longs === String ? $util.Long.prototype.toString.call(message.time) : options.longs === Number ? new $util.LongBits(message.time.low >>> 0, message.time.high >>> 0).toNumber() : message.time;
			if (message.id != null && message.hasOwnProperty("id"))
				object.id = message.id;
			return object;
		};

		/**
         * Converts this PacketPing to JSON.
         * @function toJSON
         * @memberof packets.PacketPing
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketPing.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketPing;
	})();

	packets.PacketPong = (function() {

		/**
         * Properties of a PacketPong.
         * @memberof packets
         * @interface IPacketPong
         * @property {string} ver PacketPong ver
         * @property {string} sender PacketPong sender
         * @property {number|Long} time PacketPong time
         * @property {number|Long} arrived PacketPong arrived
         * @property {string|null} [id] PacketPong id
         */

		/**
         * Constructs a new PacketPong.
         * @memberof packets
         * @classdesc Represents a PacketPong.
         * @implements IPacketPong
         * @constructor
         * @param {packets.IPacketPong=} [properties] Properties to set
         */
		function PacketPong(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketPong ver.
         * @member {string} ver
         * @memberof packets.PacketPong
         * @instance
         */
		PacketPong.prototype.ver = "";

		/**
         * PacketPong sender.
         * @member {string} sender
         * @memberof packets.PacketPong
         * @instance
         */
		PacketPong.prototype.sender = "";

		/**
         * PacketPong time.
         * @member {number|Long} time
         * @memberof packets.PacketPong
         * @instance
         */
		PacketPong.prototype.time = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

		/**
         * PacketPong arrived.
         * @member {number|Long} arrived
         * @memberof packets.PacketPong
         * @instance
         */
		PacketPong.prototype.arrived = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

		/**
         * PacketPong id.
         * @member {string} id
         * @memberof packets.PacketPong
         * @instance
         */
		PacketPong.prototype.id = "";

		/**
         * Creates a new PacketPong instance using the specified properties.
         * @function create
         * @memberof packets.PacketPong
         * @static
         * @param {packets.IPacketPong=} [properties] Properties to set
         * @returns {packets.PacketPong} PacketPong instance
         */
		PacketPong.create = function create(properties) {
			return new PacketPong(properties);
		};

		/**
         * Encodes the specified PacketPong message. Does not implicitly {@link packets.PacketPong.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketPong
         * @static
         * @param {packets.IPacketPong} message PacketPong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketPong.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 0 =*/24).int64(message.time);
			writer.uint32(/* id 4, wireType 0 =*/32).int64(message.arrived);
			if (message.id != null && message.hasOwnProperty("id"))
				writer.uint32(/* id 5, wireType 2 =*/42).string(message.id);
			return writer;
		};

		/**
         * Encodes the specified PacketPong message, length delimited. Does not implicitly {@link packets.PacketPong.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketPong
         * @static
         * @param {packets.IPacketPong} message PacketPong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketPong.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketPong message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketPong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketPong} PacketPong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketPong.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketPong();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.time = reader.int64();
						break;
					case 4:
						message.arrived = reader.int64();
						break;
					case 5:
						message.id = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("time"))
				throw $util.ProtocolError("missing required 'time'", { instance: message });
			if (!message.hasOwnProperty("arrived"))
				throw $util.ProtocolError("missing required 'arrived'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketPong message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketPong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketPong} PacketPong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketPong.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketPong message.
         * @function verify
         * @memberof packets.PacketPong
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketPong.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isInteger(message.time) && !(message.time && $util.isInteger(message.time.low) && $util.isInteger(message.time.high)))
				return "time: integer|Long expected";
			if (!$util.isInteger(message.arrived) && !(message.arrived && $util.isInteger(message.arrived.low) && $util.isInteger(message.arrived.high)))
				return "arrived: integer|Long expected";
			if (message.id != null && message.hasOwnProperty("id"))
				if (!$util.isString(message.id))
					return "id: string expected";
			return null;
		};

		/**
         * Creates a PacketPong message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketPong
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketPong} PacketPong
         */
		PacketPong.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketPong)
				return object;
			var message = new $root.packets.PacketPong();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.time != null)
				if ($util.Long)
					(message.time = $util.Long.fromValue(object.time)).unsigned = false;
				else if (typeof object.time === "string")
					message.time = parseInt(object.time, 10);
				else if (typeof object.time === "number")
					message.time = object.time;
				else if (typeof object.time === "object")
					message.time = new $util.LongBits(object.time.low >>> 0, object.time.high >>> 0).toNumber();
			if (object.arrived != null)
				if ($util.Long)
					(message.arrived = $util.Long.fromValue(object.arrived)).unsigned = false;
				else if (typeof object.arrived === "string")
					message.arrived = parseInt(object.arrived, 10);
				else if (typeof object.arrived === "number")
					message.arrived = object.arrived;
				else if (typeof object.arrived === "object")
					message.arrived = new $util.LongBits(object.arrived.low >>> 0, object.arrived.high >>> 0).toNumber();
			if (object.id != null)
				message.id = String(object.id);
			return message;
		};

		/**
         * Creates a plain object from a PacketPong message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketPong
         * @static
         * @param {packets.PacketPong} message PacketPong
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketPong.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				if ($util.Long) {
					var long = new $util.Long(0, 0, false);
					object.time = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
				} else
					object.time = options.longs === String ? "0" : 0;
				if ($util.Long) {
					var long = new $util.Long(0, 0, false);
					object.arrived = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
				} else
					object.arrived = options.longs === String ? "0" : 0;
				object.id = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.time != null && message.hasOwnProperty("time"))
				if (typeof message.time === "number")
					object.time = options.longs === String ? String(message.time) : message.time;
				else
					object.time = options.longs === String ? $util.Long.prototype.toString.call(message.time) : options.longs === Number ? new $util.LongBits(message.time.low >>> 0, message.time.high >>> 0).toNumber() : message.time;
			if (message.arrived != null && message.hasOwnProperty("arrived"))
				if (typeof message.arrived === "number")
					object.arrived = options.longs === String ? String(message.arrived) : message.arrived;
				else
					object.arrived = options.longs === String ? $util.Long.prototype.toString.call(message.arrived) : options.longs === Number ? new $util.LongBits(message.arrived.low >>> 0, message.arrived.high >>> 0).toNumber() : message.arrived;
			if (message.id != null && message.hasOwnProperty("id"))
				object.id = message.id;
			return object;
		};

		/**
         * Converts this PacketPong to JSON.
         * @function toJSON
         * @memberof packets.PacketPong
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketPong.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketPong;
	})();

	packets.PacketGossipHello = (function() {

		/**
         * Properties of a PacketGossipHello.
         * @memberof packets
         * @interface IPacketGossipHello
         * @property {string} ver PacketGossipHello ver
         * @property {string} sender PacketGossipHello sender
         * @property {string} host PacketGossipHello host
         * @property {number} port PacketGossipHello port
         */

		/**
         * Constructs a new PacketGossipHello.
         * @memberof packets
         * @classdesc Represents a PacketGossipHello.
         * @implements IPacketGossipHello
         * @constructor
         * @param {packets.IPacketGossipHello=} [properties] Properties to set
         */
		function PacketGossipHello(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketGossipHello ver.
         * @member {string} ver
         * @memberof packets.PacketGossipHello
         * @instance
         */
		PacketGossipHello.prototype.ver = "";

		/**
         * PacketGossipHello sender.
         * @member {string} sender
         * @memberof packets.PacketGossipHello
         * @instance
         */
		PacketGossipHello.prototype.sender = "";

		/**
         * PacketGossipHello host.
         * @member {string} host
         * @memberof packets.PacketGossipHello
         * @instance
         */
		PacketGossipHello.prototype.host = "";

		/**
         * PacketGossipHello port.
         * @member {number} port
         * @memberof packets.PacketGossipHello
         * @instance
         */
		PacketGossipHello.prototype.port = 0;

		/**
         * Creates a new PacketGossipHello instance using the specified properties.
         * @function create
         * @memberof packets.PacketGossipHello
         * @static
         * @param {packets.IPacketGossipHello=} [properties] Properties to set
         * @returns {packets.PacketGossipHello} PacketGossipHello instance
         */
		PacketGossipHello.create = function create(properties) {
			return new PacketGossipHello(properties);
		};

		/**
         * Encodes the specified PacketGossipHello message. Does not implicitly {@link packets.PacketGossipHello.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketGossipHello
         * @static
         * @param {packets.IPacketGossipHello} message PacketGossipHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketGossipHello.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			writer.uint32(/* id 3, wireType 2 =*/26).string(message.host);
			writer.uint32(/* id 4, wireType 0 =*/32).int32(message.port);
			return writer;
		};

		/**
         * Encodes the specified PacketGossipHello message, length delimited. Does not implicitly {@link packets.PacketGossipHello.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketGossipHello
         * @static
         * @param {packets.IPacketGossipHello} message PacketGossipHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketGossipHello.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketGossipHello message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketGossipHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketGossipHello} PacketGossipHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketGossipHello.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketGossipHello();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.host = reader.string();
						break;
					case 4:
						message.port = reader.int32();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			if (!message.hasOwnProperty("host"))
				throw $util.ProtocolError("missing required 'host'", { instance: message });
			if (!message.hasOwnProperty("port"))
				throw $util.ProtocolError("missing required 'port'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketGossipHello message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketGossipHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketGossipHello} PacketGossipHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketGossipHello.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketGossipHello message.
         * @function verify
         * @memberof packets.PacketGossipHello
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketGossipHello.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (!$util.isString(message.host))
				return "host: string expected";
			if (!$util.isInteger(message.port))
				return "port: integer expected";
			return null;
		};

		/**
         * Creates a PacketGossipHello message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketGossipHello
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketGossipHello} PacketGossipHello
         */
		PacketGossipHello.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketGossipHello)
				return object;
			var message = new $root.packets.PacketGossipHello();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.host != null)
				message.host = String(object.host);
			if (object.port != null)
				message.port = object.port | 0;
			return message;
		};

		/**
         * Creates a plain object from a PacketGossipHello message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketGossipHello
         * @static
         * @param {packets.PacketGossipHello} message PacketGossipHello
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketGossipHello.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.host = "";
				object.port = 0;
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.host != null && message.hasOwnProperty("host"))
				object.host = message.host;
			if (message.port != null && message.hasOwnProperty("port"))
				object.port = message.port;
			return object;
		};

		/**
         * Converts this PacketGossipHello to JSON.
         * @function toJSON
         * @memberof packets.PacketGossipHello
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketGossipHello.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketGossipHello;
	})();

	packets.PacketGossipRequest = (function() {

		/**
         * Properties of a PacketGossipRequest.
         * @memberof packets
         * @interface IPacketGossipRequest
         * @property {string} ver PacketGossipRequest ver
         * @property {string} sender PacketGossipRequest sender
         * @property {string|null} [online] PacketGossipRequest online
         * @property {string|null} [offline] PacketGossipRequest offline
         */

		/**
         * Constructs a new PacketGossipRequest.
         * @memberof packets
         * @classdesc Represents a PacketGossipRequest.
         * @implements IPacketGossipRequest
         * @constructor
         * @param {packets.IPacketGossipRequest=} [properties] Properties to set
         */
		function PacketGossipRequest(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketGossipRequest ver.
         * @member {string} ver
         * @memberof packets.PacketGossipRequest
         * @instance
         */
		PacketGossipRequest.prototype.ver = "";

		/**
         * PacketGossipRequest sender.
         * @member {string} sender
         * @memberof packets.PacketGossipRequest
         * @instance
         */
		PacketGossipRequest.prototype.sender = "";

		/**
         * PacketGossipRequest online.
         * @member {string} online
         * @memberof packets.PacketGossipRequest
         * @instance
         */
		PacketGossipRequest.prototype.online = "";

		/**
         * PacketGossipRequest offline.
         * @member {string} offline
         * @memberof packets.PacketGossipRequest
         * @instance
         */
		PacketGossipRequest.prototype.offline = "";

		/**
         * Creates a new PacketGossipRequest instance using the specified properties.
         * @function create
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {packets.IPacketGossipRequest=} [properties] Properties to set
         * @returns {packets.PacketGossipRequest} PacketGossipRequest instance
         */
		PacketGossipRequest.create = function create(properties) {
			return new PacketGossipRequest(properties);
		};

		/**
         * Encodes the specified PacketGossipRequest message. Does not implicitly {@link packets.PacketGossipRequest.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {packets.IPacketGossipRequest} message PacketGossipRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketGossipRequest.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			if (message.online != null && message.hasOwnProperty("online"))
				writer.uint32(/* id 3, wireType 2 =*/26).string(message.online);
			if (message.offline != null && message.hasOwnProperty("offline"))
				writer.uint32(/* id 4, wireType 2 =*/34).string(message.offline);
			return writer;
		};

		/**
         * Encodes the specified PacketGossipRequest message, length delimited. Does not implicitly {@link packets.PacketGossipRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {packets.IPacketGossipRequest} message PacketGossipRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketGossipRequest.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketGossipRequest message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketGossipRequest} PacketGossipRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketGossipRequest.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketGossipRequest();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.online = reader.string();
						break;
					case 4:
						message.offline = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketGossipRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketGossipRequest} PacketGossipRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketGossipRequest.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketGossipRequest message.
         * @function verify
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketGossipRequest.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (message.online != null && message.hasOwnProperty("online"))
				if (!$util.isString(message.online))
					return "online: string expected";
			if (message.offline != null && message.hasOwnProperty("offline"))
				if (!$util.isString(message.offline))
					return "offline: string expected";
			return null;
		};

		/**
         * Creates a PacketGossipRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketGossipRequest} PacketGossipRequest
         */
		PacketGossipRequest.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketGossipRequest)
				return object;
			var message = new $root.packets.PacketGossipRequest();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.online != null)
				message.online = String(object.online);
			if (object.offline != null)
				message.offline = String(object.offline);
			return message;
		};

		/**
         * Creates a plain object from a PacketGossipRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketGossipRequest
         * @static
         * @param {packets.PacketGossipRequest} message PacketGossipRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketGossipRequest.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.online = "";
				object.offline = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.online != null && message.hasOwnProperty("online"))
				object.online = message.online;
			if (message.offline != null && message.hasOwnProperty("offline"))
				object.offline = message.offline;
			return object;
		};

		/**
         * Converts this PacketGossipRequest to JSON.
         * @function toJSON
         * @memberof packets.PacketGossipRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketGossipRequest.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketGossipRequest;
	})();

	packets.PacketGossipResponse = (function() {

		/**
         * Properties of a PacketGossipResponse.
         * @memberof packets
         * @interface IPacketGossipResponse
         * @property {string} ver PacketGossipResponse ver
         * @property {string} sender PacketGossipResponse sender
         * @property {string|null} [online] PacketGossipResponse online
         * @property {string|null} [offline] PacketGossipResponse offline
         */

		/**
         * Constructs a new PacketGossipResponse.
         * @memberof packets
         * @classdesc Represents a PacketGossipResponse.
         * @implements IPacketGossipResponse
         * @constructor
         * @param {packets.IPacketGossipResponse=} [properties] Properties to set
         */
		function PacketGossipResponse(properties) {
			if (properties)
				for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
					if (properties[keys[i]] != null)
						this[keys[i]] = properties[keys[i]];
		}

		/**
         * PacketGossipResponse ver.
         * @member {string} ver
         * @memberof packets.PacketGossipResponse
         * @instance
         */
		PacketGossipResponse.prototype.ver = "";

		/**
         * PacketGossipResponse sender.
         * @member {string} sender
         * @memberof packets.PacketGossipResponse
         * @instance
         */
		PacketGossipResponse.prototype.sender = "";

		/**
         * PacketGossipResponse online.
         * @member {string} online
         * @memberof packets.PacketGossipResponse
         * @instance
         */
		PacketGossipResponse.prototype.online = "";

		/**
         * PacketGossipResponse offline.
         * @member {string} offline
         * @memberof packets.PacketGossipResponse
         * @instance
         */
		PacketGossipResponse.prototype.offline = "";

		/**
         * Creates a new PacketGossipResponse instance using the specified properties.
         * @function create
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {packets.IPacketGossipResponse=} [properties] Properties to set
         * @returns {packets.PacketGossipResponse} PacketGossipResponse instance
         */
		PacketGossipResponse.create = function create(properties) {
			return new PacketGossipResponse(properties);
		};

		/**
         * Encodes the specified PacketGossipResponse message. Does not implicitly {@link packets.PacketGossipResponse.verify|verify} messages.
         * @function encode
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {packets.IPacketGossipResponse} message PacketGossipResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketGossipResponse.encode = function encode(message, writer) {
			if (!writer)
				writer = $Writer.create();
			writer.uint32(/* id 1, wireType 2 =*/10).string(message.ver);
			writer.uint32(/* id 2, wireType 2 =*/18).string(message.sender);
			if (message.online != null && message.hasOwnProperty("online"))
				writer.uint32(/* id 3, wireType 2 =*/26).string(message.online);
			if (message.offline != null && message.hasOwnProperty("offline"))
				writer.uint32(/* id 4, wireType 2 =*/34).string(message.offline);
			return writer;
		};

		/**
         * Encodes the specified PacketGossipResponse message, length delimited. Does not implicitly {@link packets.PacketGossipResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {packets.IPacketGossipResponse} message PacketGossipResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
		PacketGossipResponse.encodeDelimited = function encodeDelimited(message, writer) {
			return this.encode(message, writer).ldelim();
		};

		/**
         * Decodes a PacketGossipResponse message from the specified reader or buffer.
         * @function decode
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {packets.PacketGossipResponse} PacketGossipResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketGossipResponse.decode = function decode(reader, length) {
			if (!(reader instanceof $Reader))
				reader = $Reader.create(reader);
			var end = length === undefined ? reader.len : reader.pos + length, message = new $root.packets.PacketGossipResponse();
			while (reader.pos < end) {
				var tag = reader.uint32();
				switch (tag >>> 3) {
					case 1:
						message.ver = reader.string();
						break;
					case 2:
						message.sender = reader.string();
						break;
					case 3:
						message.online = reader.string();
						break;
					case 4:
						message.offline = reader.string();
						break;
					default:
						reader.skipType(tag & 7);
						break;
				}
			}
			if (!message.hasOwnProperty("ver"))
				throw $util.ProtocolError("missing required 'ver'", { instance: message });
			if (!message.hasOwnProperty("sender"))
				throw $util.ProtocolError("missing required 'sender'", { instance: message });
			return message;
		};

		/**
         * Decodes a PacketGossipResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {packets.PacketGossipResponse} PacketGossipResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
		PacketGossipResponse.decodeDelimited = function decodeDelimited(reader) {
			if (!(reader instanceof $Reader))
				reader = new $Reader(reader);
			return this.decode(reader, reader.uint32());
		};

		/**
         * Verifies a PacketGossipResponse message.
         * @function verify
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
		PacketGossipResponse.verify = function verify(message) {
			if (typeof message !== "object" || message === null)
				return "object expected";
			if (!$util.isString(message.ver))
				return "ver: string expected";
			if (!$util.isString(message.sender))
				return "sender: string expected";
			if (message.online != null && message.hasOwnProperty("online"))
				if (!$util.isString(message.online))
					return "online: string expected";
			if (message.offline != null && message.hasOwnProperty("offline"))
				if (!$util.isString(message.offline))
					return "offline: string expected";
			return null;
		};

		/**
         * Creates a PacketGossipResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {packets.PacketGossipResponse} PacketGossipResponse
         */
		PacketGossipResponse.fromObject = function fromObject(object) {
			if (object instanceof $root.packets.PacketGossipResponse)
				return object;
			var message = new $root.packets.PacketGossipResponse();
			if (object.ver != null)
				message.ver = String(object.ver);
			if (object.sender != null)
				message.sender = String(object.sender);
			if (object.online != null)
				message.online = String(object.online);
			if (object.offline != null)
				message.offline = String(object.offline);
			return message;
		};

		/**
         * Creates a plain object from a PacketGossipResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof packets.PacketGossipResponse
         * @static
         * @param {packets.PacketGossipResponse} message PacketGossipResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
		PacketGossipResponse.toObject = function toObject(message, options) {
			if (!options)
				options = {};
			var object = {};
			if (options.defaults) {
				object.ver = "";
				object.sender = "";
				object.online = "";
				object.offline = "";
			}
			if (message.ver != null && message.hasOwnProperty("ver"))
				object.ver = message.ver;
			if (message.sender != null && message.hasOwnProperty("sender"))
				object.sender = message.sender;
			if (message.online != null && message.hasOwnProperty("online"))
				object.online = message.online;
			if (message.offline != null && message.hasOwnProperty("offline"))
				object.offline = message.offline;
			return object;
		};

		/**
         * Converts this PacketGossipResponse to JSON.
         * @function toJSON
         * @memberof packets.PacketGossipResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
		PacketGossipResponse.prototype.toJSON = function toJSON() {
			return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
		};

		return PacketGossipResponse;
	})();

	return packets;
})();

module.exports = $root;
