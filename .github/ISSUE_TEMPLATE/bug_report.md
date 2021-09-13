---
name: Bug report
about: Create a report to help us improve

---

## :octagonal_sign: Do you want to ask a question ?

Please head to the [Discord chat](https://discord.gg/TSEcDRP)

## Prerequisites

Please answer the following questions for yourself before submitting an issue. 

- [ ] I am running the latest version
- [ ] I checked the documentation and found no answer
- [ ] I checked to make sure that this issue has not already been filed
- [ ] I'm reporting the issue to the correct repository

## Current Behavior

<!-- What is the current behavior? -->

## Expected Behavior

<!-- Please describe the behavior you are expecting -->

## Failure Information

<!-- Please help provide information about the failure if this is a bug. If it is not a bug, please remove the rest of this template. -->

### Steps to Reproduce

Please provide detailed steps for reproducing the issue.

1. step 1
2. step 2
3. you get it...

### Reproduce code snippet
<!-- You can use codesandbox.io to create a reproduce code.
     Just fork it: https://codesandbox.io/embed/ky5lj09jv   -->

```js
const broker = new ServiceBroker({
    logger: console,
    transporter: "NATS"
});

broker.createService({
    name: "test",
    actions: {
        empty(ctx) {
            return "Hello"
        }
    }
});
```

### Context

Please provide any relevant information about your setup. This is important in case the issue is not reproducible except for under certain conditions.

* Moleculer version:
* NodeJS version: 
* Operating System:

### Failure Logs
```

```
