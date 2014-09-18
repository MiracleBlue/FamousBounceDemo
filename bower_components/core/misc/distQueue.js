var noop = function(){};

/**
 *	Instantiate a DistQueue
 *
 *	Usage:
 *		new DistQueue({
 *			channelPrefix: "abc",
 *			onStateChange: function(){},
 *			onConflict: function(){},
 *			debug: true
 *		});
 *
 *	Options:
 *		channelPrefix {string} Used to separate multiple queues (e.g. stores)
 *		onStateChange {function} Event handler (parameterless) - fires every time queue state changes (and after queue initialisation)
 *		onConflict {function} Event handler (parameterless) - fires when two clients attempt to take the same entry in the queue (will fire on both clients)
 *		debug {bool} Whether or not to print debug messages to console
 *		provider {object} Override for real-time provider - leave empty to use default (PubNub). See DistQueue.provider.pubnub for example implementation.
 */
var DistQueue = function(options) {
	/////////////////////////////////
	//	PRIVATE PROPERTIES
	var self = this;
	var channelPrefix = options.channelPrefix;
	var provider = options.provider || DistQueue.providers.pubnub();
	var debug = options.debug;
	var userId = provider.userId() + getCorrectedDate(Date.now());

	if (!(provider instanceof DistQueue.Provider))
		throw 'Invalid Argument: options.provider must be instanceof DistQueue.provider';

	/////////////////////////////////
	//	PRIVATE METHODS

	/**
	 *	Helper method to log to console when debugging turned on (same as console.log())
	 */
	var log = function() { options.debug && console.log.apply(console, [].slice.apply(arguments)); }

	/**
	 *	Helper method to log current queue state to console when debugging turned on
	 */
	var logQueue = function() {
		if (debug) {
			var data = [];
			for (var i = 0; i < self.queue.length; i++)
				data.push(self.queue[i].data);
			console.log('queue', data);
		}
	};

	/**
	 *	Helper method to remove a specific item from the queue - returns true if found, false if not found
	 */
	var removeItem = function(item) {
		var nqueue = [];
		for (var q = 0; q < self.queue.length; q++)
			if (self.queue[q].id != item.id)
				nqueue.push(self.queue[q]);
		var removed = nqueue.length < self.queue.length;
		self.queue = nqueue;
		return removed;
	};

	/////////////////////////////////
	//	EVENTS

	var evt = {
		/**
		 *	Event to fire when queue state has changed and any dependant modules need to be notified
		 */
		stateChange: function(sort) {
			if (self.isReady) {
				if (sort)
					self.queue.sort(function(a, b) { return a.timeAdded - b.timeAdded });
				logQueue();
				on.stateChange();
			}
		},

		/**
		 *	Event to fire when this device and another both take the same item (event fires on both devices)
		 */
		conflict: function() {
			on.conflict();
		},

		/**
		 *	Event to fire when any initialisation has finished running
		 */
		ready: function() {
			self.isReady = true;
			evt.stateChange(true);
		}
	};

	/////////////////////////////////
	//	EVENT HANDLERS

	var on = {
		/**
		 *	Handler for local event - stateChange
		 */
		stateChange: options.onStateChange || noop,

		/**
		 *	Handler for local event - conflict
		 */
		conflict: options.onConflict || noop,

		/**
		 *	Handler for provider event - queue message received
		 */
		queue: function(message) {
			try {
				if (!self.isReady || message.userId != userId) {
					log('=> queue');
					var nqueue = message.queue;
					for (var n = 0; n < nqueue.length; n++) {
						if (self.actioned[nqueue[n].id])
							continue;
						var found = false;
						for (var q = 0; q < self.queue.length && !found; q++)
							if (self.queue[q].id == nqueue[n].id)
								found = true;
						if (!found)
							self.queue.push(nqueue[n]);
					}
					evt.stateChange(true);
				}
			} catch (e) {
				log(e, message);
			}
		},

		/**
		 *	Handler for provider event - action message received
		 */
		action: function(message) {
			try {
				var reorder = false;
				if (!self.isReady || message.userId != userId) {
					switch (message.action) {
						case 'take': on.take(message.item); break;
						case 'untake': on.untake(message.item); reorder = true; break;
						case 'remove': on.remove(message.item); break;
						default: return;
					}
					self.actioned[message.item.id] = 1;
					evt.stateChange(reorder);
				}
			} catch (e) {
				log(e, message);
			}
		},

		/**
		 *	Handler for provider event - "take" action received
		 */
		take: function(item) {
			log('=> take');
			if (self.taken[item.id] && item.takenBy != userId) {
				log("take conflict", self.taken[item.id], item.takenBy != userId);
				evt.conflict();
			}

			else
				removeItem(item);
		},

		/**
		 *	Handler for provider event - "untake" action received
		 */
		untake: function(item) {
			var found = false;
			for (var q = 0; q < self.queue.length && !found; q++)
				if (self.queue[q].id == item.id)
					found = true;
			if (!found) {
				log('=> untake');
				self.queue.unshift(item);
				delete self.taken[item.id];
			}
		},

		/**
		 *	Handler for provider event - "remove" action received
		 */
		remove: function(item) {
			if (removeItem(item))
				log('=> remove');
		}
	}

	/////////////////////////////////
	//	PUBLIC PROPERTIES

	/**
	 *	Whether or not the queue has been initialised
	 */
	self.isReady = false;
	/**
	 *	The current queue state
	 */
	self.queue = [];
	/**
	 *	Which items the current user has taken
	 */
	self.taken = {};
	/**
	 *	What items have been registered as actioned (if these items show up in a subsequent "queue" broadcast, ignore them)
	 */
	self.actioned = {};

	/////////////////////////////////
	//	PUBLIC METHODS

	self.getById = function(id) {
		var output;
		for (var i = 0; i < self.queue.length; i++) {
			if (self.queue[i].id === id) output = self.queue[i];
		}
		return output;
	};

	/**
	 *	Add an item to the queue
	 */
	self.add = function(data, timestamp) {
		log('<= queue');
		var item = { id: userId + getCorrectedDate(Date.now()) + Math.random(), data: data, timeAdded: (timestamp ? timestamp : getCorrectedDate(Date.now())) };
		self.queue.push(item);
		provider.queue({ userId: userId, queue: self.queue });
		evt.stateChange();
	};

	/**
	 *	Take the first item in the queue
	 */
	self.take = function() {
		var item = self.queue.shift();
		if (item) {
			log('<= take');
			item.takenBy = userId;
			self.taken[item.id] = 1;
			self.actioned[item.id] = 1;
			provider.action({ action: 'take', userId: userId, item: item });
			evt.stateChange();
			return item;
		}
	};

	/**
	 *	Cancel a "Take" (put item back to front of queue)
	 */
	self.untake = function(item) {
		log('<= untake');
		delete item.takenBy;
		self.queue.unshift(item);
		delete self.taken[item.id];
		self.actioned[item.id] = 1;
		provider.action({ action: 'untake', userId: userId, item: item });
		evt.stateChange(true);
	};

	/**
	 *	Remove an item from anywhere in the queue
	 */
	self.remove = function(item) {
		if (removeItem(item)) {
			log('<= remove');
			self.actioned[item.id] = 1;
			provider.action({ action: 'remove', userId: userId, item: item });
			evt.stateChange();
		}
	};

	/////////////////////////////////
	// INITIALISE PROVIDER

	provider.init({
		channelPrefix: channelPrefix,
		onQueue: on.queue,
		onAction: on.action,
		ready: evt.ready
	});
};

/**
 *	Real-time provider interface for DistQueue
 */
DistQueue.Provider = function(options) {
	var self = this;

	/**
	 *	A function for returning a device identifier
	 */
	self.userId = options.userId || noop;

	/**
	 *	Initisalise queue state
	 */
	self.init = options.init || noop;

	/**
	 *	A function to broadcast the queue state
	 */
	self.queue = options.queue || noop;

	/**
	 *	A function to broadcast an action
	 */
	self.action = options.action || noop;
}

/**
 *	Real-time provider implementations
 */
DistQueue.providers = {
	//www.pubnub.com
	pubnub: function() {
		var pubnub = PUBNUB.init({
		alert("pubnub initiated");
			publish_key: 'pub-c-08ae9342-ab79-4aea-93f6-bad831afddae',
			subscribe_key: 'sub-c-242244e6-062f-11e4-b51c-02ee2ddab7fe',
			secure: window.location.protocol == 'https:'
		});

		var processHistory = function(each, then) {
			return function(result) {
				for (var i = 0; i < result[0].length; i++)
					each(result[0][i]);
				if (then)
					then(result);
			}
		}

		//Return DistQueue.Provider instance
		return new DistQueue.Provider({
			userId: pubnub.get_uuid,
			init: function(options) {
				this.channelPrefix = options.channelPrefix;

				//Subscribe to queue channel
				pubnub.subscribe({ channel: options.channelPrefix + '.queue', message: options.onQueue });

				//Subscribe to action channel
				pubnub.subscribe({ channel: options.channelPrefix + '.action', message: options.onAction });

				//Retireve history to restore current queue state - start with last broadcast queue message
				pubnub.history({
					channel: options.channelPrefix + '.queue',
					count: 1,
					callback: processHistory(options.onQueue, function(result) {
						if (result[1])
						//Then retrieve all action messages following (and 10 minutes beforehand)
							pubnub.history({
								channel: options.channelPrefix + '.action',
								count: 1000,
								end: result[1] - (10 * 60 * 1000 * 10000),
								callback: processHistory(options.onAction, options.ready)
							});
						else options.ready();
					})
				});
			},
			queue: function(message) {
				//Publish to queue channel
				pubnub.publish({ channel: this.channelPrefix + '.queue', message: message });
			},
			action: function(message) {
				//Publish to action channel
				pubnub.publish({ channel: this.channelPrefix + '.action', message: message });
			}
		});
	}
}