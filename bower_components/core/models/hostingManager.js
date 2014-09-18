define("core/models/hostingManager", function(require) {
	var HostingQueue = require("core/collections/hostingQueue");
	var QueuedPerson = require("core/models/queuedPerson");

	return Backbone.Model.extend({
		defaults: {
			queue: null,
			oldQueue: null,
			connector: null,
			queueVersion: 1,
			peopleInQueue: false,
			queueReady: false,
			stateChange: 0,
			eventListeners: null
		},
		initialize: function() {
			var self = this;
			this.set("queue", []);
			this.set("oldQueue", []);
			this.set("eventListeners", []);
		},
		// Use this to add listeners to the distqueue events, WILL NOT WORK PROPERLY FOR ONREADY CURRENTLY
		// Possible events are: onStateChange, onConflict (onReady to be implemented if required)
		addEventListener: function(event, callback) {
			var eventListeners = this.get("eventListeners");
			eventListeners.push({
				event: event,
				callback: callback
			});
			this.set("eventListeners", eventListeners);
		},
		triggerListener: function(event, data) {
			_(this.get("eventListeners")).each(function(item) {
				if (item.event === event) {
					item.callback(data);
				}
			});
		},
		createChannel: function() {
			var self = this;
			var informant = require("core/informant");
			informant.set("hostingMode", false);

			this.set("connector", new DistQueue({
				debug: true,
				channelPrefix: (informant.get("currentStore").code) + "-" + self.get("queueVersion"),
				onReady: function() {
					informant.set("hostingMode", true);
					self.set("queueReady", true);
					self.set("peopleInQueue", !!self.get("connector").queue.length);
					self.set("queue", self.get("connector").queue);
				},
				onStateChange: function() {
					var oldQueue = self.get("oldQueue");
					informant.set("hostingMode", true);
					self.set("queueReady", true);
					self.set("peopleInQueue", !!self.get("connector").queue.length);
					self.set("queue", self.get("connector").queue);
					self.set("stateChange", self.get("stateChange") + 1);

					self.triggerListener("onStateChange", {
						oldQueue: oldQueue,
						newQueue: self.get("connector").queue
					});

					self.set("oldQueue", _.cloneDeep(self.get("queue")));
				},
				onConflict: function() {
					// Conflict.  Two people took the same customer.  One must cancel out.
					self.triggerListener("onConflict");
				}
			}));
		}
	})
});