/* Copyright (C) 2018 Francesco Banconi */

'use strict';

const tap = require('tap');

const dude = require('./thedude.js');


// Test class used for testing lazy.
class TestClass {
  constructor() {
    this.fooCalled = false;
  }
  foo() {
    this.fooCalled = true;
  }
}


tap.test('future', t => {

  t.test('single callback', t => {
    const f = dude.future();
    f.addCallback(value => {
      t.equal(value, 42);
      t.end();
    });
    f.set(42);
  });

  t.test('multiple callbacks', t => {
    const f = dude.future();
    let callCount = 0;
    const callback = value => {
      t.equal(value, 47);
      callCount++;
      if (callCount === 2) {
        t.end();
      }
    };
    f.addCallback(callback);
    f.addCallback(callback);
    f.set(47);
  });

  t.test('late callback', t => {
    const f = dude.future();
    f.set(42);
    f.addCallback(value => {
      t.equal(value, 42);
      t.end();
    });
  });

  t.test('callbacks order', t => {
    const f = dude.future();
    const called = [];
    f.addCallback(_ => {
      called.push('a');
    });
    f.addCallback(_ => {
      called.push('b');
    });
    f.set(null);
    f.addCallback(_ => {
      called.push('c');
    });
    t.deepEqual(called, ['a', 'b', 'c']);
    t.end();
  });

  t.test('done', t => {
    const f = dude.future();
    t.equal(f.done, false);
    f.set('done!');
    t.equal(f.done, true);
    t.end();
  });

  t.test('error setting result multiple times', t => {
    const f = dude.future();
    f.set('done!');
    t.throws(() => {
      f.set('again!');
    });
    t.end();
  });

  t.end();
});


tap.test('lazy', t => {

  t.test('function', t => {
    // Create a lazy function.
    let value = null;
    const func = v => {
      value = v;
    };
    const lazyFunc = dude.lazy(func);
    // Call the lazy function to get the task.
    const task = lazyFunc(42);
    t.equal(value, null);
    // Run the task.
    task.run();
    t.equal(value, 42);
    t.end();
  });

  t.test('object instance', t => {
    // Create a lazy instance.
    const obj = new TestClass();
    const lazyObj = dude.lazy(obj);
    // Property are maintained.
    t.equal(obj.fooCalled, false);
    // Call the lazy method to get the task.
    const task = lazyObj.foo();
    t.equal(obj.fooCalled, false);
    // Run the task.
    task.run();
    t.equal(obj.fooCalled, true);
    t.end();
  });

  t.end();
});


// Create mock functions for testing.
const makeFunc = () => {
  function func() {
    func.args = Array.prototype.slice.call(arguments);
    func.called = true;
  }
  func.args = [];
  func.called = false;
  return func;
};


tap.test('task', t => {

  t.test('run', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    t.equal(func.called, false);
    t.equal(task.info().status, dude.PROCRASTINATING);
    // Run the task.
    task.run();
    t.equal(func.called, true);
    t.deepEqual(func.args, [1, 2]);
    // The status is updated accordingly.
    t.equal(task.info().status, dude.DONE);
    t.end();
  });

  t.test('run with future', t => {
    // Create a task depending on a future value.
    const func = makeFunc();
    const f = dude.future();
    const task = dude.task(func, 'arg', f);
    // The execution will be procrastinated waiting for the future to be done.
    task.run();
    t.equal(func.called, false);
    // The task will stop procrastinating when the future is done.
    f.set(42);
    t.equal(func.called, true);
    t.deepEqual(func.args, ['arg', 42]);
    t.end();
  });

  t.test('run with multiple futures', t => {
    // Create a task depending on multiple future values.
    const func = makeFunc();
    const f1 = dude.future();
    const f2 = dude.future();
    const task = dude.task(func, f1, f2);
    // The execution will be procrastinated waiting for all futures to be done.
    task.run();
    t.equal(func.called, false);
    // The task hangs with just one future done.
    f1.set(0);
    t.equal(func.called, false);
    // The task will stop procrastinating when the second future is also done.
    f2.set(1);
    t.equal(func.called, true);
    t.deepEqual(func.args, [0, 1]);
    t.end();
  });

  t.test('run with multiple futures in nested arguments', t => {
    // Create a task depending on multiple future values nested in its params.
    const func = makeFunc();
    const f1 = dude.future();
    const f2 = dude.future();
    const task = dude.task(func, {params: [{p1: f1}]}, [1, f2, 3]);
    // The execution will be procrastinated waiting for all futures to be done.
    task.run();
    t.equal(func.called, false);
    // The task hangs with just one future done.
    f1.set('first-param');
    t.equal(func.called, false);
    // The task will stop procrastinating when the second future is also done.
    f2.set(2);
    t.equal(func.called, true);
    t.deepEqual(func.args, [{params: [{p1: 'first-param'}]}, [1, 2, 3]]);
    t.end();
  });

  t.test('run with future already done', t => {
    // Create a task depending on a future value already done.
    const func = makeFunc();
    const f = dude.future();
    f.set('done!');
    const task = dude.task(func, f);
    // The task just runs as the future is already done.
    task.run();
    t.equal(func.called, true);
    t.deepEqual(func.args, ['done!']);
    t.end();
  });

  t.test('run asynchronous task with callback', t => {
    // Create a task from an asynchronous function.
    let task;
    let called = false;
    const cback = () => {
      called = true;
      // When the callback is called the task is still running.
      t.equal(task.info().status, dude.RUNNING);
    };
    const func = callback => {
      setTimeout(callback, 10);
      return 42;
    };
    task = dude.task(func, cback);
    // The run callback is called only after the task callback is called.
    task.run((err, result) => {
      t.equal(err, null);
      t.equal(result, 42);
      t.equal(called, true);
      //  After the callback is called the task is done.
      t.equal(task.info().status, dude.DONE);
      t.end();
    });
  });

  t.test('run asynchronous task with callback receiving args', t => {
    // Create a task from an asynchronous function.
    const func = callback => {
      setTimeout(() => callback(42, 47), 10);
    };
    dude.task(func, (a, b) => {
      t.equal(a, 42);
      t.equal(b, 47);
      t.end();
    }).run();
  });

  t.test('synchronize tasks', t => {
    // Create tasks depending on each other.
    const fa = dude.future();
    const fb = dude.future();
    const fx = dude.future();
    let result = 0;
    const sum = (a, b) => {
      result = a + b;
    };
    const multiply = (x, y) => {
      fa.set(x * y);
    };
    const number = (f, num) => {
      return () => {
        setTimeout(() => f.set(num), 10);
      };
    };
    const task1 = dude.task(sum, fa, fb);
    dude.task(multiply, fx, 10).run();
    dude.task(number(fb, 2)).run();
    dude.task(number(fx, 4)).run();
    task1.run(err => {
      t.equal(err, null);
      t.equal(result, 42); // 4 * 10 + 2;
      t.end();
    });
  });

  t.test('error: run twice', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    // Run the task.
    task.run();
    // Running the task again raises an error.
    task.run((err, result) => {
      t.equal(err, 'cannot run a task twice');
      t.equal(result, null);
      t.end();
    });
  });

  t.test('error: run canceled task', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    // Cancel the task and try to run it later.
    task.cancel();
    task.run((err, result) => {
      t.equal(err, 'cannot run a canceled task');
      t.equal(result, null);
      t.end();
    });
  });

  t.test('cancel succeeded', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    // Cancel the task.
    const canceled = task.cancel();
    t.equal(canceled, true);
    // The status is updated accordingly.
    t.equal(task.info().status, dude.CANCELED);
    t.end();
  });

  t.test('cancel succeeded while waiting for a future', t => {
    // Create a task depending on a future value.
    const func = makeFunc();
    const f = dude.future();
    const task = dude.task(func, 'arg', f);
    // The execution will be procrastinated waiting for the future to be done.
    task.run();
    // Cancel the task before the future is done.
    const canceled = task.cancel();
    t.equal(canceled, true);
    // The task will not run even when the future value arrives.
    f.set(42);
    t.equal(func.called, false);
    // The status is updated accordingly.
    t.equal(task.info().status, dude.CANCELED);
    t.end();
  });

  t.test('cancel failed', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    // Run the task.
    task.run();
    // Cancel the task.
    const canceled = task.cancel();
    t.equal(canceled, false);
    // The status shows that nothing was canceled after the fact.
    t.equal(task.info().status, dude.DONE);
    t.end();
  });

  t.test('error: cancel twice', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    // Cancel the task.
    task.cancel();
    // Canceling the task again throws an error.
    t.throws(task.cancel);
    t.end();
  });

  t.test('info indentifiers', t => {
    const func = makeFunc();
    const task1 = dude.task(func);
    const task2 = dude.task(func);
    // The identifiers are incremental.
    const id1 = task1.info().id;
    const id2 = task2.info().id;
    t.equal(id2, id1 + 1);
    t.end();
  });

  t.test('note', t => {
    const task = dude.task(makeFunc());
    // Every task starts with no notes.
    t.deepEqual(task.info().notes, {});
    // Add notes.
    task.note({name: 'mytask', description: 'it does stuff'});
    t.deepEqual(task.info().notes, {
      name: 'mytask',
      description: 'it does stuff'
    });
    // Add more notes.
    task.note({args: [42, 47], description: 'another one'});
    t.deepEqual(task.info().notes, {
      name: 'mytask',
      description: 'another one',
      args: [42, 47]
    });
    t.end();
  });

  t.test('notes immutability', t => {
    const task = dude.task(makeFunc());
    // Add some notes.
    const notes = {a: 1, b: [2]};
    task.note(notes);
    // After mutating the original object notes are not mutated.
    notes.c = 3;
    notes.b.push(4);
    const storedNotes = task.info().notes;
    t.deepEqual(storedNotes, {a: 1, b: [2]});
    // Mutating the returned notes does not mutate the stored ones.
    storedNotes.c = 5;
    storedNotes.b.push(6);
    t.deepEqual(task.info().notes, {a: 1, b: [2]});
    t.end();
  });

  t.end();
});


tap.test('list', t => {

  t.test('add', t => {
    // Create a task.
    const func = makeFunc();
    const task = dude.task(func, 1, 2);
    // Create a task list and add the task to the list.
    const list = dude.list();
    list.add(task);
    // When running the task list the task is executed.
    list.run(() => {
      t.equal(func.called, true);
      t.deepEqual(func.args, [1, 2]);
      t.end();
    });
  });

  t.test('asArray', t => {
    // Create a list with a couple of tasks.
    const task1 = dude.task(makeFunc());
    const task2 = dude.task(makeFunc());
    const list = dude.list();
    list.add(task1);
    list.add(task2);
    // Get back tasks as an array.
    const tasks = list.asArray();
    t.deepEqual(tasks, [task1, task2]);
    // Mutating the returned array does not mutate tasks in the task list.
    tasks.push(dude.task(makeFunc()));
    t.equal(list.asArray().length, 2);
    t.end();
  });

  t.test('asArray with no tasks', t => {
    const list = dude.list();
    t.deepEqual(list.asArray(), []);
    t.end();
  });

  t.test('clear', t => {
    // Create a list with a couple of tasks.
    const task1 = dude.task(makeFunc());
    const task2 = dude.task(makeFunc());
    const list = dude.list();
    list.add(task1);
    list.add(task2);
    // Clear the list.
    list.clear();
    // When running the task list, no tasks are actually executed.
    list.run(null, tasks => {
      t.deepEqual(tasks, []);
      t.equal(task1.info().status, dude.PROCRASTINATING);
      t.equal(task2.info().status, dude.PROCRASTINATING);
      t.end();
    });
  });

  t.test('lazy with function', t => {
    const list = dude.list();
    // Create a lazy function.
    let value = null;
    const func = v => {
      value = v;
    };
    const lazyFunc = list.lazy(func);
    // Call the lazy function.
    lazyFunc(42);
    t.equal(value, null);
    // Run the task list.
    list.run();
    t.equal(value, 42);
    t.end();
  });

  t.test('lazy with instance', t => {
    const list = dude.list();
    // Create a lazy instance.
    const obj = new TestClass();
    const lazyObj = list.lazy(obj);
    // Property are maintained.
    t.equal(obj.fooCalled, false);
    // Call the lazy method.
    lazyObj.foo();
    t.equal(obj.fooCalled, false);
    // Run the task list.
    list.run();
    t.equal(obj.fooCalled, true);
    t.end();
  });

  t.test('run with asynchronous tasks', t => {
    const list = dude.list();
    // Create lazy functions depending on each other.
    const fa = dude.future();
    const fb = dude.future();
    const fx = dude.future();
    let result = 0;
    const sum = list.lazy((a, b) => {
      result = a + b;
      return a + b;
    });
    const multiply = list.lazy((x, y) => {
      fa.set(x * y);
    });
    const number = (f, timeout)  => {
      return list.lazy(num => {
        setTimeout(() => f.set(num), timeout);
      });
    };
    // Create corresponding tasks.
    sum(fa, fb).note({name: 'sum'});
    multiply(fx, 10).note({name: 'multiply'});
    number(fb, 10)(2).note({name: 'number2'});
    number(fx, 20)(4).note({name: 'number4'});
    // Run the task list.
    const wantNames = ['multiply', 'number2', 'number4', 'sum'];
    const gotNames = [];
    list.run((err, result, task) => {
      const name = task.info().notes.name;
      t.equal(err, null);
      t.equal(result, name === 'sum' ? 42 : undefined);
      gotNames.push(name);
    }, results => {
      t.equal(result, 42);
      t.deepEqual(gotNames.sort(), wantNames);
      const names = [];
      results.forEach(result => {
        t.equal(result.err, null);
        const info = result.task.info();
        t.equal(info.status, dude.DONE);
        names.push(info.notes.name);
      });
      t.deepEqual(names.sort(), wantNames);
      t.end();
    });

  });

  t.test('run with canceled tasks', t => {
    const list = dude.list();
    // Create lazy functions depending on each other.
    const f = dude.future();

    const sum = list.lazy((a, b) => {
      return a + b;
    });
    const number = list.lazy(() => {
      setTimeout(() => f.set(42), 10);
    });
    // Create corresponding tasks.
    const task = sum(47, f);
    number();
    // Cancel the first task.
    task.cancel();
    // Run the task list.
    list.run(null, t.end);
  });

  t.end();
});
