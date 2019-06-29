title: Protocol v4 (rev. 1)
---

This documentation describes the communication protocol between Moleculer nodes. 

**Variables in topic names:**
- `<namespace>` - Namespace from broker options
- `<nodeID>` - Target nodeID
- `<action>` - Action name. E.g.: `posts.find`
- `<group>` - Event group name. E.g.: `users`
- `<event>` - Event name. E.g.: `user.created`


## Subscriptions
After the client is connected to the message broker (NATS, Redis, MQTT), it subscribes to the following topics:

| Type | Topic name |
| ---- | ---------- |
| Event | `MOL.EVENT.<nodeID>` |
| Event (balanced) | `MOL.EVENTB.<event>` |
| Request | `MOL.REQ.<nodeID>` |
| Request (balanced) | `MOL.REQB.<action>` |
| Response | `MOL.RES.<nodeID>` |
| Discover | `MOL.DISCOVER` |
| Discover (targetted) | `MOL.DISCOVER.<nodeID>` |
| Info | `MOL.INFO` |
| Info (targetted) | `MOL.INFO.<nodeID>` |
| Heartbeat | `MOL.HEARTBEAT` |
| Ping | `MOL.PING` |
| Ping (targetted) | `MOL.PING.<nodeID>` |
| Pong | `MOL.PONG.<nodeID>` |
| Disconnect | `MOL.DISCONNECT` |

> If `namespace` is defined, the topic prefix is `MOL-namespace` instead of `MOL`. For example: `MOL-dev.EVENT` if the namespace is `dev`.

## Discovering
After subscriptions, the client broadcasts a `DISCOVER` packet. In response to this, all connected nodes send back `INFO` packet to the sender node. From these responses, the client builds its own service registry. At last, the client broadcasts own INFO packet to all other nodes.
![](http://moleculer.services/images/protocol-v2/moleculer_protocol_discover.png)

## Heartbeat
The client has to broadcast `HEARTBEAT` packets periodically. The period value comes from broker options (`heartbeatInterval`). The default value is 5 secs. 
If the client does not receive `HEARTBEAT` for `heartbeatTimeout` seconds from a node, marks it broken and doesn't route requests to this node.
![](http://moleculer.services/images/protocol-v2/moleculer_protocol_heartbeat.png)

## Request-reply
When you call the `broker.call` method, the broker sends a `REQUEST` packet to the targetted node. It processes the request and sends back a `RESPONSE` packet to the requester node.
![](http://moleculer.services/images/protocol-v2/moleculer_protocol_request.png)

## Event
When you call the `broker.emit` method, the broker sends an `EVENT` packet to the subscriber nodes. The broker groups & balances the subscribers, so only one instance per service receives the event. If you call the `broker.broadcast` method, the broker sends an `ĘVENT` packet to all subscriber nodes. It doesn't group & balance the subscribers.
![](http://moleculer.services/images/protocol-v2/moleculer_protocol_event.png)

## Ping-pong
When you call the `broker.ping` method, the broker sends a `PING` packet to the targetted node. If node is not defined, it sends to all nodes. If the client receives the `PING` packet, sends back a `PONG` response packet. If it receives, broker broadcasts a local `$node.pong` event to the local services.
![](http://moleculer.services/images/protocol-v2/moleculer_protocol_pong.png)

## Disconnect
When a node is stopping, it broadcasts a `DISCONNECT` packet to all nodes.
![](http://moleculer.services/images/protocol-v2/moleculer_protocol_disconnect.png)

## Packets

### `DISCOVER`

**Topic name:**
- `MOL.DISCOVER` (if broadcasts)
- `MOL.DISCOVER.node-1` (if sent only to `node-1`)
- `MOL-dev.DISCOVER` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |


### `INFO`

**Topic name:**
- `MOL.INFO` (if broadcasts)
- `MOL.INFO.node-1` (if sent only to `node-1`)
- `MOL-dev.INFO` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `services` | `object` | ✔ | Services list. (*) |
| `config` | `object` | ✔ | Client configuration. (*) |
| `instanceID` | `string` | ✔ | Instance ID |
| `ipList` | `[string]` | ✔ | IP address list of node |
| `hostname` | `string` | ✔ | Hostname of node |
| `client` | `object` | ✔ | Client information |
|   `client.type` | `string` | ✔ | Type of client implementation(`nodejs`, `java`, `go`) |
|   `client.version` | `string` | ✔ | Client (Moleculer) version |
|   `client.langVersion` | `string` | ✔ | NodeJS/Java/Go version |
| `metadata` | `object` | ✔ | Node-specific metadata. (*) |

> (*) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string.

### `HEARTBEAT`

**Topic name:**
- `MOL.HEARTBEAT`
- `MOL-dev.HEARTBEAT` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `cpu` | `double` | ✔ | Current CPU utilization (percentage). |


### `REQUEST`

**Topic name:**
- `MOL.REQ.node-2`
- `MOL.REQB.<action>` (if built-in balancer is disabled)
- `MOL-dev.REQ.node-2` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Context ID. |
| `action` | `string` | ✔ | Action name. E.g.: `posts.find` |
| `params` | `object` |   | `ctx.params` object. (**) |
| `paramsType` | `enum` | ✔ | Data type of `ctx.params`. (***) |
| `meta` | `object` | ✔ | `ctx.meta` object. (*) |
| `timeout` | `double` | ✔ | Request timeout (distributed) in milliseconds. |
| `level` | `int32` | ✔ | Level of request. |
| `tracing` | `boolean` | ✔ | Need to send tracing events. |
| `parentID` | `string` |  | Parent context ID. |
| `requestID` | `string` |  | Request ID from `ctx.requestID`. |
| `caller` | `string` |  | Action name of the caller. |
| `stream` | `boolean` | ✔ | Stream request. |
| `seq` | `int32` |   | Stream sequence number. |

> (*) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string.
> (**) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string and transferred as binary data.
> (**) Used only in `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer to detect the original type of data.

### `RESPONSE`

**Topic name:**
- `MOL.RES.node-1`
- `MOL-dev.RES.node-1` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Context ID (from `REQUEST`). |
| `success` | `boolean` | ✔ | Is it a success response? |
| `data` | `object` |  | Response data if success. (**) |
| `dataType` | `enum` | ✔ | Data type of `ctx.params`. (***) |
| `error` | `object` |  | Error object if not success. (*) |
| `meta` | `object` | ✔ | `ctx.meta` object. (*) |
| `stream` | `boolean` | ✔ | Stream request. |
| `seq` | `int32` |   | Stream sequence number. |

> (*) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string.
> (**) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string and transferred as binary data.
> (**) Used only in `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer to detect the original type of data.

### `EVENT`

**Topic name:**
- `MOL.EVENT.node-1`
- `MOL.EVENTB.<group>.<event>` (if built-in balancer is disabled)
- `MOL-dev.EVENT.node-1` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Context ID. |
| `event` | `string` | ✔ | Event name. E.g.: `users.created` |
| `data` | `object` |   | Event payload. (**) |
| `dataType` | `enum` | ✔ | Data type of `ctx.params`. (***) |
| `meta` | `object` | ✔ | `ctx.meta` object. (*) |
| `level` | `int32` | ✔ | Level of event. |
| `tracing` | `boolean` | ✔ | Need to send tracing events. |
| `parentID` | `string` |  | Parent context ID. |
| `requestID` | `string` |  | Request ID from `ctx.requestID`. |
| `caller` | `string` |  | Action/Event name of the caller. |
| `stream` | `boolean` | ✔ | Stream request. |
| `seq` | `int32` |   | Stream sequence number. |
| `groups` | `Array<string>` |   | Groups for balanced events. |
| `broadcast` | `boolean` | ✔ | Broadcast event |

> (*) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string.
> (**) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string and transferred as binary data.
> (**) Used only in `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer to detect the original type of data.

### `EVENTACK`
___Not implemented yet.___

**Topic name:**
- `MOL.EVENTACK.node-1`
- `MOL-dev.EVENTACK` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Event Context ID. |
| `success` | `boolean` | ✔ | Is it successful? |
| `group` | `string` |  | Group of event handler. |
| `error` | `object` |  | Error object if not success. (*) |

> (*) In case of `ProtoBuf`, `Avro`, `Thrift` or any other schema-based serializer, the field value is encoded to JSON string.


### `PING`

**Topic name:**
- `MOL.PING` (if broadcasts)
- `MOL.PING.node-1` (if sent only to `node-1`)
- `MOL-dev.PING` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Message ID. |
| `time` | `int64` | ✔ | Time of sent. (*) |

> (*) The number of milliseconds between 1 January 1970 00:00:00 UTC and the given date.

### `PONG`

**Topic name:**
- `MOL.PONG.node-1`
- `MOL-dev.PONG` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Message ID. |
| `time` | `int64` | ✔ | Timestamp of sent. (*) |
| `arrived` | `int64` | ✔ | Timestamp of arrived. (*) |

> (*) The number of milliseconds between 1 January 1970 00:00:00 UTC and the given date.

### `DISCONNECT`

**Topic name:**
- `MOL.DISCONNECT`
- `MOL-dev.DISCONNECT` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `ver` | `string` | ✔ | Protocol version. Current: `'4'`. |
| `sender` | `string` | ✔ | Sender nodeID. |

