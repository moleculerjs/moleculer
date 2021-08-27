const ServiceBroker = require("../../../src/service-broker");
const { MoleculerError } = require("../../../src/errors");
const Context = require("../../../src/context");
const Middleware = require("../../../src/middlewares").ErrorHandler;
const { protectReject } = require("../utils");

describe("Test ErrorHandlerMiddleware", () => {
  const broker = new ServiceBroker({ nodeID: "server-1", logger: false, transporter: "Fake" });
  const actionHandler = jest.fn(() => Promise.resolve("Result"));
  const eventHandler = jest.fn(() => Promise.resolve("Result"));
  const action = {
    name: "posts.find",
    handler: actionHandler,
    service: {
      name: "posts",
      fullName: "posts"
    }
  };

  const event = {
    name: "post.created",
    handler: eventHandler,
    service: {
      name: "posts",
      fullName: "posts"
    }
  };

  const actionEndpoint = {
    action,
    node: {
      id: broker.nodeID
    }
  };

  const eventEndpoint = {
    event,
    node: {
      id: broker.nodeID
    }
  };

  broker.errorHandler = jest.fn(err => Promise.reject(err));

  const mw = Middleware(broker);

  it("should register hooks", () => {
    expect(mw.localAction).toBeInstanceOf(Function);
    expect(mw.remoteAction).toBeInstanceOf(Function);
  });

  it("should wrap handler", () => {
    const newHandler = mw.localAction.call(broker, actionHandler, action);
    expect(newHandler).not.toBe(actionHandler);

    const newHandler2 = mw.remoteAction.call(broker, actionHandler, action);
    expect(newHandler2).not.toBe(actionHandler);

    const newHandler3 = mw.localEvent.call(broker, eventHandler, event);
    expect(newHandler3).not.toBe(eventHandler);
  });

  describe("Test with actions", () => {
    it("should call broker errorHandler", () => {
      broker.errorHandler.mockClear();
      const error = new MoleculerError("Something wrong");
      let handler = jest.fn(() => Promise.reject(error));

      const newHandler = mw.localAction.call(broker, handler, action);
      const ctx = Context.create(broker, actionEndpoint);

      return newHandler(ctx)
        .then(protectReject)
        .catch(err => {
          expect(err).toBeInstanceOf(MoleculerError);
          expect(err.name).toBe("MoleculerError");
          expect(err.message).toBe("Something wrong");
          expect(err.ctx).toBe(ctx);

          expect(broker.errorHandler).toBeCalledTimes(1);
          expect(broker.errorHandler).toBeCalledWith(err, {
            ctx,
            service: action.service,
            action
          });
        });
    });

    it("should convert if not Error", () => {
      broker.errorHandler.mockClear();
      let handler = jest.fn(() => Promise.reject("Something wrong"));

      const newHandler = mw.localAction.call(broker, handler, action);
      const ctx = Context.create(broker, actionEndpoint);

      return newHandler(ctx)
        .then(protectReject)
        .catch(err => {
          expect(err).toBeInstanceOf(Error);
          expect(err).toBeInstanceOf(MoleculerError);
          expect(err.name).toBe("MoleculerError");
          expect(err.message).toBe("Something wrong");
          expect(err.ctx).toBe(ctx);

          expect(broker.errorHandler).toBeCalledTimes(1);
          expect(broker.errorHandler).toBeCalledWith(err, {
            ctx,
            service: action.service,
            action
          });
        });
    });

    it("should remove pending request if remote call", () => {
      let error = new MoleculerError("Some error");
      let handler = jest.fn(() => Promise.reject(error));
      broker.transit.removePendingRequest = jest.fn();

      const newHandler = mw.localAction.call(broker, handler, action);
      const ctx = Context.create(broker, actionEndpoint);
      ctx.id = "123456";
      ctx.nodeID = "server-2";

      return newHandler(ctx)
        .then(protectReject)
        .catch(err => {
          expect(err).toBe(error);
          expect(err.ctx).toBe(ctx);

          expect(broker.transit.removePendingRequest).toHaveBeenCalledTimes(1);
          expect(broker.transit.removePendingRequest).toHaveBeenCalledWith("123456");
        });
    });
  });

  describe("Test with events", () => {
    it("should call broker errorHandler", () => {
      broker.errorHandler.mockClear();
      const error = new MoleculerError("Something wrong");
      let handler = jest.fn(() => Promise.reject(error));

      const newHandler = mw.localEvent.call(broker, handler, event);
      const ctx = Context.create(broker, eventEndpoint);

      return newHandler(ctx)
        .then(() => { fail('error should be thrown to the transit message handler') })
        .catch((err) => {
          expect(error.ctx).toBe(ctx);
          expect(broker.errorHandler).toBeCalledTimes(1);
          expect(broker.errorHandler).toBeCalledWith(err, {
            ctx,
            service: action.service,
            event
          });
        });
    });

    it("should convert if not Error", () => {
      broker.errorHandler.mockClear();
      let handler = jest.fn(() => Promise.reject("Something wrong"));

      const newHandler = mw.localEvent.call(broker, handler, action);
      const ctx = Context.create(broker, eventEndpoint);

      return newHandler(ctx)
        .then(() => { fail('error should be thrown to the transit message handler') })
        .catch((err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err).toBeInstanceOf(MoleculerError);
          expect(err.name).toBe("MoleculerError");
          expect(err.message).toBe("Something wrong");
          expect(err.ctx).toBe(ctx);

          expect(broker.errorHandler).toBeCalledTimes(1);
          expect(broker.errorHandler).toBeCalledWith(err, {
            ctx,
            service: action.service,
            event
          });
        });
    });

    it("should logging if throw further", () => {
      broker.errorHandler = jest.fn(err => Promise.reject(err));
      let error = new MoleculerError("Some error");
      let handler = jest.fn(() => Promise.reject(error));

      const newHandler = mw.localEvent.call(broker, handler, action);
      const ctx = Context.create(broker, eventEndpoint);
      ctx.id = "123456";
      ctx.nodeID = "server-2";

      jest.spyOn(broker.logger, "error");

      return newHandler(ctx)
        .then(() => { fail('error should be thrown to the transit message handler') })
        .catch((err) => {

          expect(err).toBe(error);
          expect(err.ctx).toBe(ctx);

          expect(broker.logger.error).toHaveBeenCalledTimes(1);
          expect(broker.logger.error).toHaveBeenCalledWith(err);
        });
    });

    describe('if the error handler resolves the error', () => {
      beforeEach(() => {
        broker.errorHandler = jest.fn(() => Promise.resolve(true));
      });

      it('should return the response from the error handler', () => {
        let error = new MoleculerError("Some error");
        let handler = jest.fn(() => Promise.reject(error));

        const newHandler = mw.localEvent.call(broker, handler, action);
        const ctx = Context.create(broker, eventEndpoint);
        ctx.id = "123456";
        ctx.nodeID = "server-2";


        return newHandler(ctx)
          .then((res) => {
            expect(res).toBe(true);
            expect(error.ctx).toBe(ctx);
            expect(broker.errorHandler).toBeCalledTimes(1);
            expect(broker.errorHandler).toBeCalledWith(error, {
              ctx,
              service: action.service,
              event
            });
          })
      });
    });
  });
});
