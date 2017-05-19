<a name="0.8.0"></a>
# 0.8.0 (2017-xx-xx)

# New
## Built-in circuit breaker [#22](https://github.com/ice-services/moleculer/issues/22/)
Implemented better circuit breaker solution. Now every calls (local and remote) are protected with the built-in circuit breaker.
You need only enable it in broker options.

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
Created a built-in Service Registry module. It handles actions of services on nodes, circuit breaker logic...etc. In the future it will be perhaps pluggable.

Via broker options you can change the load balancing strategies of Service Registry.

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
Broker has an interactive REPL mode. You can load services, call actions, emit events, subscribe & unsubscribe events from your console. You can list registered nodes & actions.

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
There is available to call an action directly on a specified node. For use, you need to set `nodeID` in options of call.

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

# Changes

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
                throw new CustomError("Access denied!");
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
