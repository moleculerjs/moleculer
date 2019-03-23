const Lock = require("../../src/lock");

describe("Test lock", () => {
  let key = "abc123"
  it("should lock", () => {
    const lock = new Lock();

    return lock.acquire(key).then(() => {
      expect(lock.isLocked(key)).toBeTruthy()
      return lock.release(key).then(() => {
        expect(lock.isLocked(key)).toBeFalsy()
      })
    });
  });

  it("2 locks", () => {
    const lock = new Lock();
    let released = 0;
    return Promise.all([
      lock.acquire(key).then(() => {
        expect(lock.isLocked(key)).toBeTruthy();
        return new Promise(function(resolve, reject) {
          setTimeout(()=>{
            released = 1;
            lock.release(key).then(() => {
              expect(lock.isLocked(key)).toBeFalsy();
              resolve();
            });
          }, 200);
        });
      }),
      lock.acquire(key).then(() => {
        expect(lock.isLocked(key)).toBeTruthy();
        expect(released).toBe(1);
        return lock.release(key).then(() => {
          expect(lock.isLocked(key)).toBeFalsy();
        });
      })
    ]);
  });

  it("should lock the concurrency call", () => {
    let taskes = [1, 2, 3, 4];
    let globalValue = 0;
    const lock = new Lock();
    return Promise.all(taskes.map(task => {
      return lock.acquire(key).then(() => {
        globalValue = task;
        return new Promise(function(resolve, reject) {
          setTimeout(() => {
            expect(globalValue).toEqual(task);
            lock.release(key).then(() => {
              resolve()
            });
          }, Math.random() * 500);
        });
      });
    }));
  });
});
