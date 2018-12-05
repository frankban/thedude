/* Copyright (C) 2018 Francesco Banconi */

/**
  This library provides the ability to defer the execution of functions.
  This is useful when the client wants to collect a set of actions (tasks) to
  be only executed later. The ability to synchronize asynchronous tasks is also
  provided through futures, so that a task is executed only when its arguments
  are all available.
*/

'use strict';


/**
  Return a lazy function or instance from the given function or instance.

  Lazy functions return a task and accept futures as placeholders for values
  that will be available only later.

  @param {Function|Object} funcOrObj The original function, object, or instance
    to decorate so that it becomes lazy. Being lazy means that the function
    itself (or all object methods, when an instance is provided) returns a task
    rather than actually execute its body.
  @param {Function} createTask a function used to create a task given the
    original function and the arguments provided in one specific call. This is
    only available internally.
  @returns {Function} The lazy function or instance.
*/
function makeLazy(funcOrObj, createTask) {
  function decorate(func) {
    return function() {
      return createTask(func, ...arguments);
    };
  }

  if (typeof funcOrObj === 'function') {
    // A function was passed, so just return its decorated counterpart.
    return decorate(funcOrObj);
  }
  // An object was passed, decorate all its methods.
  const instance = {};
  let proto = null;
  if (funcOrObj.constructor.name === 'Object') {
    // If a raw object was provided.
    proto = funcOrObj;
  } else {
    // It's an instance of another constructor.
    proto = Object.getPrototypeOf(funcOrObj);
  }
  Object.getOwnPropertyNames(proto).forEach(name => {
    const prop = funcOrObj[name];
    if (name === 'constructor' || typeof prop !== 'function') {
      // Do not modify constructors or properties that are not methods.
      instance[name] = prop;
      return;
    }
    instance[name] = decorate(prop.bind(funcOrObj));
  });
  return instance;
}


/**
  Create a task representing a call of the given function and arguments.

  @param {Function} func The function executed when running the task.
  @param {Array} args The arguments to use when executing the function. An
    argument can have any type as usual. If an argument is provided as a
    future, the the task will wait for the future to be done before executing
    the function. If the last argument is a function, it is a assumed to be a
    callback, and therefore the function is assumed to be asynchronous.
  @returns {Object} An API object to interact with the task, with the following
    methods:
      - run(callback): run the task and, if provided, call the callback when
        the execution completes. When the task function last argument is a
        callback, then the callback provided to "run" is called right after the
        asynchronous function executes its own callback;
      - note(notes): add annotations to the task, for instance to make it
        easier to identify specific tasks or to provide metadata. The given
        notes is an object with key/value pairs representing notes.
      - info(): return information about the task as an object with the
        following fields:
        - id: the task identifier;
        - notes: the notes added using note() (see above);
        - status: a string representing the task status, between:
          - dude.PROCRASTINATING: the task function has not been started yet.
            Note that a task could be procrastinating even if run has been
            called, for instance, because it's waiting for all required futures
            to be done;
          - dude.RUNNING: the task is currently running;
          - dude.CANCELED: the task has been canceled using cancel, and will
            not be able to be run anymore;
          - dude.DONE: the task completed, and cannot be run again.
      - cancel(): try to cancel the execution of the task, and return whether
        the process succeeded. Note that canceling a task only succeeds when
        the task is still procrastinating.
*/
function createTask(func, ...args) {
  const task = new Task(func, args);
  return task.api;
}


/**
  An object representing a single execution of a function.

  It is instantiated providing the function and its arguments.
*/
class Task {

  constructor(func, args) {
    this.func = func;
    this.args = args;

    // Statuses are: procrastinating -> running -> done or canceled.
    this.status = PROCRASTINATING;
    this.id = counter++;
    this.futures = [];
    this.notes = {};
    this.called = false;

    // Define the public API exposed to clients.
    this.api = {
      run: this.run.bind(this),
      cancel: this.cancel.bind(this),

      info: this.info.bind(this),
      note: this.note.bind(this)
    };
  }

  /**
    Run the task.
    Raise an error if the task was previously called already or canceled.

    @param {Function} callback Optional callback to be called when the task
      execution completes, receiving an error and what the original function
      returns as a result. When the task function last argument is a callback,
      then the callback here is only called after the function's own callback.
  */
  run(callback) {
    if (!callback) {
      callback = () => {};
    }
    if (this.called) {
      callback('cannot run a task twice', null);
      return;
    }
    if (this.status === CANCELED) {
      callback('cannot run a canceled task', null);
      return;
    }
    this.called = true;
    this.searchFutures(this.args, callback);
    // Applying could be already executed by a done future in searchFutures.
    if (this.status === PROCRASTINATING) {
      this.applyMaybe(callback);
    }
  }

  /**
    Try to cancel the execution of the task.
    Raise an error if the task was already previously canceled.

    @returns {Boolean} Whether canceling the task succeeded. Note that
      canceling a task only succeeds when the task is still procrastinating.
  */
  cancel() {
    if (this.status === CANCELED) {
      throw new Error(
        'cannot cancel a task twice: ' + JSON.stringify(this.info()));
    }
    if (this.status !== PROCRASTINATING) {
      return false;
    }
    this.status = CANCELED;
    return true;
  }

  /**
    Return information about the task.

    @returns {Object} Info object with the following fields:
      - id: the task identifier;
      - notes: the notes added using note();
      - status: a string representing the task status. Possible values are:
        - dude.PROCRASTINATING: the task function has not been started yet.
          Note that a task could be procrastinating even if run has been
          called, for instance, because it's waiting for all required futures
          to be done;
        - dude.RUNNING: the task is currently running;
        - dude.CANCELED: the task has been canceled using cancel, and will
          not be able to be run anymore;
        - dude.DONE: the task completed, and cannot be run again.
  */
  info() {
    return {
      id: this.id,
      status: this.status,
      notes: JSON.parse(JSON.stringify(this.notes))
    };
  }

  /**
    Add annotations to the task.
    This can be done by clients, for instance, to make it easier to identify
    specific tasks or to provide metadata.

    @param {Object} notes Key/value pairs representing notes.
  */
  note(notes) {
    Object.assign(this.notes, JSON.parse(JSON.stringify(notes)));
  }

  searchFutures(obj, callback) {
    Object.getOwnPropertyNames(obj).forEach(key => {
      let value;
      try {
        value = obj[key];
      } catch(_) {
        // This must be a non-accessible value, like "arguments" in Safari.
        return;
      }
      if (value instanceof Future) {
        this.futures.push(value);
        value.addCallback(result => {
          // When the future is done, replace it with the actual value in args
          // and delete it from the list of futures.
          obj[key] = result;
          this.futures.splice(this.futures.indexOf(value), 1);
          // Then, check whether this task can be run.
          this.applyMaybe(callback);
        });
        return;
      }
      if (value !== null && typeof value === 'object') {
        this.searchFutures(value, callback);
      }
    });
  }

  applyMaybe(callback) {
    if (this.status === CANCELED || this.futures.length) {
      return;
    }
    // All futures are done.
    this.status = RUNNING;
    // Result is set later when running the function.
    let result;
    const exec = args => {
      result = this.func.apply(null, args);
    };
    const cback = err => {
      this.status = DONE;
      callback(err, result);
    };
    const args = this.args.slice();
    const lastArg = args[this.func.length-1];
    if (typeof lastArg === 'function') {
      // Assume the last argument is a callback for an asynchronous call.
      args[this.func.length-1] = function() {
        try {
          lastArg(...Array.from(arguments));
        } catch(err) {
          cback(err);
          return;
        }
        cback(null);
      };
      exec(args);
      return;
    }
    exec(args);
    cback(null);
  }

}


// Define task statuses.
const PROCRASTINATING = 'procrastinating';
const RUNNING = 'running';
const CANCELED = 'canceled';
const DONE = 'done';

// Define the global counter used for incremental task identifiers.
let counter = 0;


/**
  A list of tasks to be executed together.
  Tasks are executed in the order they are added by explicitly using
  TaskList.add or by calling functions decorated with TaskList.lazy.
*/
class TaskList {

  constructor(options={}) {
    // TODO(frankban): add support for timing out tasks.
    this._tasks = [];
  }

  /**
    Add a task to this list.

    @param {Object} task A Task instance.
  */
  add(task) {
    this._tasks.push(task);
  }

  /**
    Return a lazy function or instance from the given function or instance.
    When the function is executed, the corresponding task is automatically
    added to this task list.

    @param {Object or Function} funcOrObj The original function or
      instance to decorate so that it becomes lazy. Being lazy means that the
      function itself (or all object methods, when an instance is provided)
      returns a task rather than actually execute its body.
    @returns {Function} The lazy function or instance.
  */
  lazy(funcOrObj) {
    return makeLazy(funcOrObj, (func, ...args) => {
      const task = createTask(func, ...args);
      this.add(task);
      return task;
    });
  }

  /**
    Return all tasks in this list.

    @returns {Array} The list of tasks.
  */
  asArray() {
    return this._tasks.slice();
  }

  /**
    Remove all tasks from this list.
  */
  clear() {
    this._tasks = [];
  }

  /**
    Run all tasks in this list.

    @param {Function} changesCallback An optional callback called every time a
      task in the list completes its execution. It receives an error (or null),
      the task result (if any) and the task itself.
    @param {Function} doneCallback An optional callback called when all current
      tasks complete. It receives a list of objects, one object for every task
      run, with the "task", "result" and "err" keys.
  */
  run(changesCallback, doneCallback) {
    if (!doneCallback) {
      doneCallback = () => {};
    }
    if (!changesCallback) {
      changesCallback = () => {};
    }
    const tasks = this._tasks;
    if (!tasks.length) {
      doneCallback([]);
      return;
    }
    const results = [];
    // TODO(frankban): make the slice/splice logic faster by using maps.
    const removeTask = task => {
      tasks.splice(tasks.indexOf(task), 1);
    };
    tasks.slice().forEach(task => {
      if (task.info().status === CANCELED) {
        removeTask(task);
        return;
      }
      task.run((err, result) => {
        // Collect all results for later and call the changes callback.
        results.push({task: task, err: err, result: result});
        changesCallback(err, result, task);
        removeTask(task);
        // Call the done callback if all tasks are complete.
        if (!tasks.length) {
          doneCallback(results);
        }
      });
    });
  }

}


/**
  A value that will be available in the future.

  Example usage:
    const f = dude.future();
    f.addCallback(console.log);
    f.done; // false
    f.set('hello world'); // Outputs 'hello world'.
    f.done; // true
    f.addCallback(console.log); // Outputs 'hello world' again, immediately.
    f.set('goodbye world'); // Raises a 'future is already done' exception.
*/
class Future {

  constructor() {
    // Done holds whether the future is done (i.e. "set" has been called).
    this.done = false;
    this._call = null;
    this._callback = value => {
      this.done = true;
    };
  }

  /**
    Set the result for this future. From this point on, the future is "done"
    and the done property returns true.
    An error is raised if a value is set on a future that is already done.

    @param {Any} value The result for this future, which will be passed on any
      callback registered before or after the value has been set.
  */
  set(value) {
    if (this.done) {
      throw new Error('future is already done');
    }
    this._callback(value);
    this._callback = null;
    this._call = callback => {
      callback(value);
    };
  }

  /**
    Register a callback to be called when the future is done, with its result.
    If the future is already done, the callback is called immediately with the
    value. Callbacks are executed in the order they are added.

    @param {Function} callback The callback function, accepting a value.
  */
  addCallback(callback) {
    if (this.done) {
      this._call(callback);
      return;
    }
    const previous = this._callback;
    this._callback = value => {
      previous(value);
      callback(value);
    };
  }

}


module.exports = {
  future: () => {
    return new Future();
  },
  lazy: funcOrObj => {
    return makeLazy(funcOrObj, createTask);
  },
  task: createTask,
  list: options => {
    return new TaskList(options);
  },
  PROCRASTINATING: PROCRASTINATING,
  RUNNING: RUNNING,
  CANCELED: CANCELED,
  DONE: DONE
};
