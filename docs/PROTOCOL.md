# Moleculer protocol v0.9.x

This documentation describes the communication protocol between nodes. 

**Variables in topic names:**
- `<namespace>` - Namespace from broker options
- `<nodeID>` - NodeID of target


## Subscriptions
After the client is connected to the message broker (NATS, Redis, MQTT) it subscribes to topics.

| Type | Topic name | Example |
| ---- | ---------- | ------- |
| Event | `MOL-<namespace>.EVENT` | `MOL-dev.EVENT` or `MOL.EVENT` (if no namespace) |
| Request | `MOL-<namespace>.REQUEST.<nodeID>` | `MOL-dev.REQUEST.node-2` or `MOL.REQUEST.node-2` (if no namespace) |
| Response | `MOL-<namespace>.RESPONSE.<nodeID>` | `MOL-dev.RESPONSE.node-1` or `MOL.RESPONSE.node-1` (if no namespace) |
| Discover | `MOL-<namespace>.DISCOVER` | `MOL-dev.DISCOVER` or `MOL.DISCOVER` (if no namespace) |
| Info | `MOL-<namespace>.INFO` | `MOL-dev.INFO` or `MOL.INFO` (if no namespace) |
| Info (targetted) | `MOL-<namespace>.INFO.<nodeID>` | `MOL-dev.INFO.node-1` or `MOL.INFO.node-1` (if no namespace) |
| Heartbeat | `MOL-<namespace>.HEARTBEAT` | `MOL-dev.HEARTBEAT` or `MOL.HEARTBEAT` (if no namespace) |
| Disconnect | `MOL-<namespace>.DISCONNECT` | `MOL-dev.DISCONNECT` or `MOL.DISCONNECT` (if no namespace) |

## Discovering
After subscriptions the client broadcasts a `DISCOVER` packet. In response to this every connected nodes send back an INFO packet to the sender node. From these responses the client need to build its own service registry. At last, the client broadcasts also own INFO packet to all nodes.
![](http://moleculer.services/images/protocol-0.8/moleculer_protocol_discover.png)

## Heartbeat
The client has to broadcast `HEARTBEAT` packets periodically. The period value is come from broker settings. Default value is 10 secs. 
If the client doesn't receive `HEARTBEAT` for `period*3` seconds from a node, it marks the node to broken and doesn't route requests this node.
![](http://moleculer.services/images/protocol-0.8/moleculer_protocol_heartbeat.png)

## Request-reply
When you call the `broker.call` method, the broker sends a `REQUEST` packet to the targetted node. It processes the request and sends back a `RESPONSE` packet to the requester node.
![](http://moleculer.services/images/protocol-0.8/moleculer_protocol_request.png)

## Event
When you call the `broker.emit` method, the broker broadcasts an `EVENT` packet to all nodes.
![](http://moleculer.services/images/protocol-0.8/moleculer_protocol_event.png)

## Disconnect
When a node is stopping, it broadcasts a `DISCONNECT` packet to all nodes.
![](http://moleculer.services/images/protocol-0.8/moleculer_protocol_disconnect.png)

## Packets

### `DISCOVER`

Topic name:
- `MOL.DISCOVER`
- `MOL-dev.DISCOVER` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |


### `INFO`

Topic name:
- `MOL.INFO` (if broadcasts)
- `MOL.INFO.node-1` (if sent only to `node-1` nodeID)
- `MOL-dev.INFO` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |
| `services` | `string` | ✔ | JSON encoded string with services list. |
| `uptime` | `double` | ✔ | Uptime of process. |
| `ipList` | `[string]` | ✔ | List of IP address of node |
| `versions` | `object` | ✔ | Versions |
| `versions.node` | `string` | ✔ | NodeJS version |
| `versions.moleculer` | `string` | ✔ | Moleculer version |


### `HEARTBEAT`

Topic name:
- `MOL.HEARTBEAT`
- `MOL-dev.HEARTBEAT` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |
| `uptime` | `double` | ✔ | Uptime of process. |


### `REQUEST`

Topic name:
- `MOL.REQUEST.node-2`
- `MOL-dev.REQUEST.node-2` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Context ID. |
| `action` | `string` | ✔ | Name of action. E.g.: `posts.find` |
| `params` | `string` | ✔ | JSON encoded `ctx.params` object. |
| `meta` | `string` | ✔ | JSON encoded `ctx.meta` object. |
| `timeout` | `double` | ✔ | Request timeout (distributed). |
| `level` | `int32` | ✔ | Level of request. |
| `metrics` | `boolean` | ✔ | Need to send metrics events. |
| `parentID` | `string` |  | Parent context ID. |


### `RESPONSE`

Topic name:
- `MOL.RESPONSE.node-1`
- `MOL-dev.RESPONSE.node-1` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |
| `id` | `string` | ✔ | Context ID. |
| `success` | `boolean` | ✔ | Is it a success response? |
| `data` | `string` |  | JSON encoded response |
| `error` | `object` |  | Error object if it is not success. |
| `error.name` | `string` | ✔ | Error name. |
| `error.message` | `string` | ✔ | Error message. |
| `error.code` | `string` | ✔ | Error code. |
| `error.type` | `string` | ✔ | Error type. |
| `error.data` | `string` | ✔ | JSON encoded data of error. |
| `error.stack` | `string` | ✔ | Call stack traces. |
| `error.nodeID` | `string` | ✔ | NodeID when the error generated. |


### `EVENT`

Topic name:
- `MOL.EVENT`
- `MOL-dev.EVENT` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |
| `event` | `string` | ✔ | Event name. E.g.: `users.created` |
| `data` | `string` | ✔ | JSON encoded event payload. |


### `DISCONNECT`

Topic name:
- `MOL.DISCONNECT`
- `MOL-dev.DISCONNECT` (if namespace is `dev`)

**Fields:**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `sender` | `string` | ✔ | Sender nodeID. |

