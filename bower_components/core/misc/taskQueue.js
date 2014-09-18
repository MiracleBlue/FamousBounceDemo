/**
 * Instantiate a taskQueue
 * @param {string} name REQUIRED A unique identifier for the queue (used as a key for localStorage)
 * @param {int} interval OPTIONAL How long (in ticks) between automatic queue runs
 * @param {bool} debug OPTIONAL Display console status messages
 */
var TaskQueue = function(name, interval, stateProvider, debug, maxHours) {
	if (!maxHours) maxHours = 2; // Default is 2 hours
	if (!name) throw 'Error: name required';
	var self = this;
	var _q = [];
	var _w = {};
	var _h = null;
	var _i = interval;
	var _s = stateProvider || TaskQueue.defaultStateProvider();

	/**
	 * INTERNAL Restore the queue from stateProvider
	 */
	var _restore = function() {
		try {
			_q = _s.restore() || [];
		}
		catch (e) { }
	};

	/**
	 * INTERNAL Save the queue to stateProvider
	 */
	var _persist = function() {
		_s.persist(_q);
	};

	/**
	 * INTERNAL Add task to queue
	 * @param {task} task REQUIRED The task to queue
	 * @param {bool} doPersist OPTIONAL Whether or not to trigger a _persist
	 */
	var _queue = function(task, doPersist) {
		if (!task) throw 'Error: task required';
		_q.push(task);
		if (doPersist)
			_persist();
	};

	/**
	 * INTERNAL Pulls a task off the front of the queue and executes it
	 * @param {bool} doPersist OPTIONAL Whether or not to trigger a _persist
	 */
	var _exec = function(doPersist, onComplete) {
		var task = _q.shift();
		var timeDiff = Date.now() - task.timeAdded;
		if (timeDiff > maxHours * (1000 * 60 * 60)) return;
		debug && console.log('exec', task.worker, task.args);

		var done = function(result) {
			if (!result)
				_queue(task, doPersist);
			else if (doPersist)
				_persist();
			onComplete(result);
		}

		try {
			var args = _.clone(task.args);
			args.push(done);
			_w[task.worker].apply(task.thisArg, args);
		} catch (e) {
			done(false);
		}
		return true;
	};

	/**
	 * Register a worker method
	 * @param {string} name REQUIRED The name of the worker
	 * @param {func} func REQUIRED The worker method
	 * @return {func} A function that will queue tasks for this worker: function(args, thisArg)
	 */
	self.worker = function(name, func) {
		if (!name) throw 'Error: name required';
		if (!func) throw 'Error: func required';
		_w[name] = func;
		return function() {
			self.queue(name, [].slice.call(arguments));
		};
	};

	/**
	 * Queue a task
	 * @param {string} worker REQUIRED The name of the worker
	 * @param {array} args OPTIONAL The arguments for the worker
	 * @param {object} thisArg OPTIONAL The object to .apply the worker method to ("this")
	 */
	self.queue = function(worker, args, thisArg) {
		if (!worker) throw 'Error: worker required';
		var nowTime = Date.now();
		var msg = { worker: worker, args: args, thisArg: thisArg, timeAdded: nowTime };
		_queue(msg, true);
	};

	/**
	 * Pulls a task off the front of the queue and executes it
	 */
	self.exec = function() { _exec(true) }

	/**
	 * Executes all tasks in the queue - will continue iterating until there are no unprocessed tasks in queue
	 */
	self.execAll = function(failCount) {

		if (debug && typeof(failCount) == 'undefined')
			console.log('\n>> execAll [' + _q.length + ']');

		failCount = failCount || 0;
		if (failCount < _q.length) {
			_exec(false, function(result) {
				self.execAll(result ? failCount : failCount + 1);
			});
		} else {
			_persist();
			debug && console.log('>> finish\n');
		}
	};

	/**
	 * Clears the queue (erases all tasks)
	 */
	self.clear = function() {
		_q = [];
		_persist();
	};

	/**
	 * Retrieve the queue length
	 * @return {int} The queue length
	 */
	self.length = function() {
		return _q.length;
	};

	/**
	 * Start queue auto timer
	 * @param {int} interval OPTIONAL time in ticks between queue runs (will default to pre-set interval)
	 */
	self.start = function(interval) {
		self.stop();
		if (!(_i = interval || _i))
			throw('Error: No interval set');
		_h = window.setInterval(self.execAll, _i);
	};

	/**
	 * Stop queue auto timer
	 */
	self.stop = function() {
		window.clearInterval(_h);
	};

	_restore();
};

/**
 * Stores queue state in localStorage for offline capability
 */
TaskQueue.localStorageStateProvider = function(queueName) {
	var _key = 'taskQueue.' + name;
	return {
		restore: function() { return JSON.parse(localStorage.getItem(_key)) },
		persist: function(queue) { localStorage.setItem(_key, JSON.stringify(queue)); }
	}
}

/**
 * Does not store state - no offline capability
 */
TaskQueue.noStateProvider = function() {
	return {
		restore: function() { },
		persist: function() { }
	}
}

TaskQueue.defaultStateProvider = TaskQueue.localStorageStateProvider;