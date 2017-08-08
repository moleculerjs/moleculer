<a name="0.8.x"></a>
# 0.9.x (2017-08-xx)

# Breaking changes

## Renamed internal service settings
The `useVersionPrefix` is renamed to `$noVersionPrefix`. The `serviceNamePrefix` is renamed to `$noServiceNamePrefix`. Both settings logical state is changed.
The `cache` setting is renamed to `$cache`.

### Migration guide

**Before**
```js
broker.createService({
    name: "test",
    settings: {
        useVersionPrefix: false,
        serviceNamePrefix: false,
        cache: true
    }
});
```

**After**
```js
broker.createService({
    name: "test",
    settings: {
        $noVersionPrefix: true,
        $noServiceNamePrefix: true,
        $cache: true
    }
});
```

## Changed versioned action names
Based on [58](https://github.com/ice-services/moleculer/issues/58) if service version is a `String`, the version in action names won't be prefixed with `v`, expect if it is a `Number`.

**Example**
```js
broker.createService({
    name: "test",
    version: 3,
    actions: {
        hello(ctx) {}
    }
});
broker.call("v3.test.hello");

broker.createService({
    name: "test",
    version: "staging",
    actions: {
        hello(ctx) {}
    }
});
broker.call("staging.test.hello");
```

# New 

## Dynamic service load & destroy
Available to load & destroy services after the broker started.

**Example**
```js

broker.start().then(() => {

	setTimeout(() => {
		// Create a new service after 5s
		broker.createService({
			name: "math",
			actions: {
				add(ctx) {
					return Number(ctx.params.a) + Number(ctx.params.b);
				},
			}
		});

	}, 5000);

	setTimeout(() => {
		// Destroy a created service after 10s
		let svc = broker.getService("math");
		broker.destroyService(svc);

	}, 10000);

});
```

# Fixes

--------------------------------------------------
<a name="0.8.5"></a>
# 0.8.5 (2017-08-06)

# Fixes
- fixed logger method bindings.
- fixed transporter shutdown errors [#62](https://github.com/ice-services/moleculer/issues/62)

--------------------------------------------------
<a name="0.8.4"></a>
# 0.8.4 (2017-07-24)

# Fixes
- fixed `Calling error! TypeError : Cannot read property 'requestID' of undefined` error when you call a local action from other one directly.

--------------------------------------------------
<a name="0.8.3"></a>
# 0.8.3 (2017-07-24)

# New

## Removable actions in mixins
You can remove an existing action when mixing a service.

```
broker.createService({
    name: "test",
    mixins: [OtherService],
    actions: {
        dangerAction: false
    }
});
```
In the `test` service the `dangerAction` action won't be registered.

## Support NPM modules in `moleculer-runner`
You can load services from NPM module in `moleculer-runner`.

**With CLI arguments**
```bash
$ moleculer-runner -r npm:moleculer-fake npm:moleculer-twilio
```

**With env**
```bash
$ SERVICES=posts,users,npm:moleculer-fale,npm:moleculer-twilio

$ moleculer-runner
```

--------------------------------------------------
<a name="0.8.2"></a>
# 0.8.2 (2017-07-06)

# Fixes
- fixed Redis cacher option resolver in ServiceBroker. Now it accepts connection string.

    ```js
    let broker = new ServiceBroker({
        cacher: "redis://localhost"
    });
    ```

# New

## Validator updated
The fastest-validator is updated to [v0.5.0](https://github.com/icebob/fastest-validator/releases/tag/v0.5.0). It supports multi rules & custom validators.

--------------------------------------------------
<a name="0.8.1"></a>
# 0.8.1 (2017-07-03)

# New

## Improved mixin's merge logic [#50](https://github.com/ice-services/moleculer/issues/50/)
The mixins merge logic is handle better events & lifecycle events. If you have a `created`, `started`, `stopped` lifecycle event or any other service event handler in your services, but your mixin has the same event, Moleculer will call all of them in your service and in mixins. 

[Read more about mixins](http://moleculer.services/docs/service.html#Mixins)

--------------------------------------------------

<a name="0.8.0"></a>
# 0.8.0 (2017-06-21)

# New

## Project runner script
There is a new Moleculer project runner script in the `bin` folder.
You can use it if you want to create small repos for services. In this case you needn't to create a ServiceBroker with options. Just create a `moleculer.config.js` or `moleculer.config.json` file in the root of repo fill it with your options and call the `moleculer-runner` within the NPM scripts.
As an other solution you can put it to the environment variables instead of putting  options to file.

[Read more about runner](http://moleculer.services/docs/runner.html)

## Shorthand for transporters, cachers and serializers in broker options
Some new resolvers are implemented in broker options to support shorthand configurations. This feature is enabled to load broker options easily from a JSON file or load from environment variables.

**Usage for transporters**
```js
// Connect to the NATS default (localhost) server
let broker = new ServiceBroker({
    transporter: "NATS"
});

// Connect to a NATS server with connection string
let broker = new ServiceBroker({
    transporter: "nats://nats-server:4222"
});

// Connect to a NATS server with transporter options
let broker = new ServiceBroker({
    transporter: {
        type: "NATS",
        options: {
            prefix: "TEST",
            nats: {
                host: "nats-server",
                user: "admin",
                pass: "nats-pass"
            }
        }
    }
});
```

**Usage for cachers**
```js
// Use a memory cacher
let broker = new ServiceBroker({
    cacher: true
    // or
    // cacher: "Memory"
});

// Use a Redis cacher with default options
let broker = new ServiceBroker({
    cacher: "Redis"
});

// Use a Redis cacher with options
let broker = new ServiceBroker({
    cacher: {
        type: "Redis",
        options: {
            ttl: 100
        }
    }
});
```

**Usage for serializers**
```js
// Use the Avro serializer
let broker = new ServiceBroker({
    serializers: "Avro"
});

// Use the Protocol Buffer serializer
let broker = new ServiceBroker({
    serializers: {
        type: "ProtoBuf"
    }
});
```

## Built-in circuit breaker [#22](https://github.com/ice-services/moleculer/issues/22/)
A better circuit breaker solution has recently been implemented. As a result of this improvement every call (local and remote) is protected by the built-in circuit breaker.
You only need to enable it in broker options.

**Usage**
```js
let broker = new ServiceBroker({
    circuitBreaker: {
        enabled: true, // Enable this feature
        maxFailures: 5, // Trip breaker on 5 failures
        halfOpenTime: 10 * 1000 // 10 sec to switch to `half-open` state
        failureOnTimeout: true // Failure if request timed out
        failureOnReject: true // Failure if request rejected with error code >= 500
    }
});
```

*`nodeUnavailable` method is dropped.*

## Service Registry module
A built-in Service Registry module was created. It handles actions of services on nodes, circuit breaker logic...etc. It would be pluggable in the future.

You can change the load balancing strategies of Service Registry via broker options.

**Example**

```js
const { STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM } = require("moleculer");

let broker = new ServiceBroker({
    registry: {
        strategy: STRATEGY_ROUND_ROBIN, // Load balancing strategy
		preferLocal: true // First call local service if available
    }
});
```

## REPL mode [#30](https://github.com/ice-services/moleculer/issues/30/)
Broker module has an interactive REPL mode. You can call actions, load services, also emit events, subscribe to & unsubscribe from events from your console. You can list registered nodes & actions.
> To use REPL mode please install the [moleculer-repl](https://github.com/ice-services/moleculer-repl) module with `npm install moleculer-repl --save` command.

**Start REPL mode**
```js
let broker = new ServiceBroker({ logger: console });

// Start REPL
broker.repl();
```

**Commands**
```
  Commands:

    help [command...]                      Provides help for a given command.
    exit                                   Exits application.
    q                                      Exit application
    call <actionName> [params]             Call an action
    dcall <nodeID> <actionName> [params]   Call a direct action
    emit <eventName> [payload]             Emit an event
    load <servicePath>                     Load a service from file
    loadFolder <serviceFolder> [fileMask]  Load all service from folder
    subscribe <eventName>                  Subscribe to an event
    unsubscribe <eventName>                Unsubscribe from an event
    actions [options]                      List of actions
    nodes                                  List of nodes
    info                                   Information from broker
```

### REPL Commands

**List nodes**
```
mol $ nodes
```
![image](https://cloud.githubusercontent.com/assets/306521/26260893/67a579d4-3ccf-11e7-955a-70f252aa260d.png)

**List services**
```
mol $ services
```

**List actions**
```
mol $ actions
```
![image](https://cloud.githubusercontent.com/assets/306521/26260954/8ef9d44e-3ccf-11e7-995a-ccbe035b2a9a.png)

**Show common informations**
```
mol $ info
```
![image](https://cloud.githubusercontent.com/assets/306521/26260974/aaea9b02-3ccf-11e7-9e1c-ec9150518791.png)

**Call an action**
```
mol $ call "test.hello"
```

**Call an action with params**
```
mol $ call "math.add" '{"a": 5, "b": 4}'
```

**Direct call**
```
mol $ dcall server-2 "$node.health"
```

**Emit an event**
```
mol $ emit "user.created"
```

**Subscribe to an event**
```
mol $ subscribe "user.created"
```

**Unsubscribe from an event**
```
mol $ unsubscribe "user.created"
```

**Load a service**
```
mol $ load "./math.service.js"
```

**Load services from folder**
```
mol $ load "./services"
```

## Direct call
It is available to call an action directly on a specified node. To use it set `nodeID` in options of call.

**Example**

```js
broker.call("user.create", {}, { timeout: 5000, nodeID: "server-12" });
```

## Mergeable schemas in `createService`
Now there is a second parameter of `broker.createService`. With it you can override the schema properties. You can use it to use a built-in service & override some props.

**Example**

```js
broker.createService(apiGwService, {
    settings: {
        // Change port setting
        port: 8080
    },
    actions: {
        myAction() {
            // Add a new action to apiGwService service
        }
    },

    created() {
        // Overwrite apiGwService.created handler
    }
});
```

Or you can merge it manually with `mergeSchemas` method.
```js
let mergedSchema = broker.mergeSchemas(origSchema, modifications);
broker.createService(mergedSchema);
```

## Service mixins
Like mergeable schemas, the service may include any mixin schemas. The constructor of Service merges these mixins with the schema of Service. It is to reuse an other Service in your service or extend an other Service.

**Examples**

```js
const ApiGwService = require("moleculer-web");

module.exports = {
    name: "api",
    mixins: [ApiGwService]
    settings: {
        // Change port setting
        port: 8080
    },
    actions: {
        myAction() {
            // Add a new action to apiGwService service
        }
    }
}
```

## New option to protect calling loop
You can protect your app against calling loop with the new `maxCallLevel` option. If the `ctx.level` value reaches this limit, it throwns a `MaxCallLevelError` error.

```js
let broker = new ServiceBroker({
    maxCallLevel: 100
});
```

## New Service setting
There is a new `useVersionPrefix` option in Service settings. If it is `false`, Moleculer can't use the version number of service as prefix for action names. The name of service will be `users.find` instead of `v2.users.find`. The default is `true`.

# Changes

## Removed the `node.reconnected` and `node.broken` events (breaking)
We merged the `node.connected` and `node.reconnected` events. The payload is changed:
```js
{
    node: {...},
    reconnected: false // it indicates the node is connected or reconnected
}
```

We merged also the `node.disconnected` and `node.broken` events. The payload is changed:
```js
{
    node: {...},
    unexpected: true // True: broken, not coming heart-beat, False: received "DISCONNECT" packet
}
```

## Remove Transporter, Cacher and Serializers dependencies (breaking)
Moleculer doesn't contain dependencies for NATS, Redis, MQTT, MsgPack, Avro and Protobuf. So it need install manually in your project.
If you want to create a Moleculer project which communicates via NATS and your Redis cacher, you have to install `npm install moleculer nats redis --save`

## Changed code of ServiceNotFoundError
The code of `ServiceNotFoundError` is changed from `501` to `404`. [More info](https://github.com/ice-services/moleculer-web/issues/7)

## Using Nanomatch instead of micromatch
Memory cacher is using [nanomatch](https://github.com/micromatch/nanomatch) instead of [micromatch](https://github.com/micromatch/micromatch). The `nanomatch` is ~10x faster.

## Removed `metricsSendInterval` option [#24](https://github.com/ice-services/moleculer/issues/24/)
The `metricsSendInterval` option is removed from broker options. If you want to access statistics & health info, call the `$node.health` and `$node.stats` actions.

## Metrics & Statistics separated [#24](https://github.com/ice-services/moleculer/issues/24/)
The metrics & statistics features separated. You can use just metrics or just statistics.

## Metrics nodeID
Metrics events contains two nodeID properties. 
- `nodeID`: the "caller" nodeID
- `targetNodeID`: in case of remote call this is the remote nodeID

## Response error with stack trace
If an action responses an error on a remote node, the transporter will send back the error to the caller with the stack traces.
```js
// It will print the original error stack trace.
broker.call("account.deposit").catch(err => console.log(err.stack)); 
```

## Type property in custom error
The `CustomError` class renamed to `MoleculerError`. also it has a `type` new property. You can store here a custom error type. For example, if you have a `ValidationError`, in some cases the `name` & `code` is not enough. By `type` error causes are to be stored. 

**Example**
```js
const ERR_MISSING_ID = "ERR_MISSING_ID";
const ERR_ENTITY_NOT_FOUND = "ERR_ENTITY_NOT_FOUND";

broker.createService({
    actions: {
        get(ctx) {
            if (ctx.params.id) {
                const entity = this.searchEntity(ctx.params.id);
                if (entity)
                    return entity;
                else
                    return Promise.reject(new ValidationError("Not found entity!", ERR_ENTITY_NOT_FOUND));
            } else
                return Promise.reject(new ValidationError("Please set the ID field!", ERR_MISSING_ID));
        }
    }
});
```

## Renamed `appendServiceName` settings to `serviceNamePrefix` in Service schema

## Fatal crash
The `ServiceBroker` has a new `fatal` method. If you call it, broker will log the message with `fatal` level and exit the process with code `2`.

`broker.fatal(message, err, needExit = true)`
> If you are running your app in containers and it has restart policy, you can use it to restart your app.

**Usage**
```js

try {
    // Do something dangerous
} catch(err) {
    broker.fatal("Dangerous thing is happened!", err, true);
}

```

## Low-level changes
- new output of `$node.actions` and `$node.services`
- In packet `INFO` & `DISCOVER` changed the `actions` property to `services` and now it contains all services with actions of node
- splitted `broker.registerService` to `registerLocalService` and `registerRemoteService`
- new `broker.unregisterServicesByNode`. It will be called when a node disconnected

--------------------------------------------------


<a name="0.7.0"></a>
# 0.7.0 (2017-04-24)

# New
## Serializers for transporters [#10](https://github.com/ice-services/moleculer/issues/10/)
Implemented pluggable serializers.
Built-in serializers:
- [x] JSON (default)
- [x] [Avro](https://github.com/mtth/avsc)
- [x] [MsgPack](https://github.com/mcollina/msgpack5)
- [x] [ProtoBuf](https://developers.google.com/protocol-buffers/)

**Usage**
```js
let JSONSerializer = require("moleculer").Serializers.JSON;

let broker = new ServiceBroker({
	serializer: new JSONSerializer(),
	transporter: new Transporter(),
	nodeID: "node-1"	
});
```

## Typescript definition file [#5](https://github.com/ice-services/moleculer/issues/5)
Created an index.d.ts file. I'm not familiar in Typescript, so if you found error please help me and open a PR with fix. Thank you!

## Metrics rate option
Added `metricsRate` options to broker. This property sets the rate of sampled calls. 
- `1` means to metric all calls
- `0.5` means to metric 50% of calls
- `0.1` means to metric 10% of calls

**Usage**
```js
let broker = new ServiceBroker({
    metrics: true,
    metricsRate: 0.1
});
```

## Context meta data ([#16](https://github.com/ice-services/moleculer/pull/16))
Added `meta` prop to `Context`. The `meta` will be merged if has parent context.
In case of remote calls the metadata will be transfered to the target service.

**Usage**

Set meta in `broker.call`:
```js
// Broker call with meta data
broker.call("user.create", { name: "Adam", status: true}, {
    timeout: 1000,
    meta: {
        // Send logged in user data with request to the service
        loggedInUser: {
            userID: 45,
            roles: [ "admin" ]
        }
    }
})
```

Access meta in action:
```js
broker.createService({
    name: "user",
    actions: {
        create(ctx) {
            const meta = ctx.meta;
            if (meta.loggedInUser && meta.loggedInUser.roles.indexOf("admin") !== -1)
                return Promise.resolve(...);
            else
                throw new MoleculerError("Access denied!");
        }
    }
});
```

# Changes

## Update benchmarkify
Benchmarkify updated & created continuous benchmarking with [bench-bot](https://github.com/icebob/bench-bot). 
Bench-bot is a benchmark runner. If a new Pull Request opened, bench-bot will run benchmarks against the `master` branch and it will post the results to the PR conversation.

## Timeout & fallback response handling in local calls too
- Can be use timeout & fallback response in local calls.
- Timeout handling move from `Transit` to `ServiceBroker`
- Remove `wrapContentAction`
- In case of calling error, Node will be unavailable only if the error code >= `500`

## Context changes
- Removed `createSubContext`
- Removed `ctx.parent` and added `ctx.parentID`
- Removed options in constructor. New constructor syntax:
    ```js
    let ctx = new Context(broker, action);
    ctx.setParams({ a: 5 });
    ctx.generateID(); // for metrics
    ctx.requestID = requestID;
    ```
- Add Context reference to returned Promise
    ```js
    const p = broker.call("user.create");
    console.log("Context:", p.ctx);
    ```

## Sender in event handlers
If an event triggered remotely on an other node, broker passes the nodeID of sender to the event handler as 2nd parameter.
```js
// Usage in subscription
broker.on("**", (payload, sender) => console.log(`Event from ${sender || "local"}:`, payload));

// Usage in Service schema
broker.createService({
	...
	events: {
		something(payload, sender) {
			console.log(`Something happened on '${sender}':`, payload);			
		}
	}
});
```

## Distributed timeout handling
Moleculer uses [distributed timeouts](https://www.datawire.io/guide/traffic/deadlines-distributed-timeouts-microservices/).In the chained calls the `ctx.call` decrement the original timeout value with the elapsed time. If the new calculated timeout is less or equal than 0, it'll skip the next calls because the first call is rejected with `RequestTimeoutError` error.


--------------------------------------------------


<a name="0.6.0"></a>
# 0.6.0 (2017-03-31)

# New

## Validator library changed
The previous `validatorjs` validator removed and added own very fast [fastest-validator](https://github.com/icebob/fastest-validator) library. It can 3M validations/sec. Hereafter validation is not the bottle-neck. Only -7% slower with validation.

**Here is the new benchmark result:**
```
Suite: Call with param validator
√ No validator x 588,463 ops/sec ±1.11% (84 runs sampled)
√ With validator passes x 541,903 ops/sec ±1.41% (84 runs sampled)
√ With validator fail x 25,648 ops/sec ±1.62% (85 runs sampled)
   No validator              0.00%    (588,463 ops/sec)
   With validator passes    -7.91%    (541,903 ops/sec)
   With validator fail     -95.64%     (25,648 ops/sec)
```

**Example params definition:**
```js
mult: {
    params: {
        a: { type: "number" },
        b: { type: "number" }
    },
    handler(ctx) {
        return Number(ctx.params.a) * Number(ctx.params.b);
    }
}
```

**Validation error object:**
```js
[ { 
    type: 'number',
    field: 'b',
    message: 'The \'b\' field must be a number!' 
} ]
```

# Changes
## Added & removed log levels
* Added 2 new log levels (`fatal` and `trace`);
* Removed unused `log` level. Use `info` level instead.

**Available levels:**
```js
logger.trace("trace level");
logger.debug("debug level");
logger.info("info level");
logger.warn("warn level");
logger.error("error level");	
logger.fatal("fatal level");
```

**Logger fallback levels:**
* `trace` -> `debug` -> `info`
* `debug` -> `info`
* `info`: main level, no fallback
* `warn` -> `error` -> `info`
* `error` -> `info`
* `fatal` -> `error` -> `info`


--------------------------------------------------


<a name="0.5.0"></a>
# 0.5.0 (2017-02-26)

First release.
