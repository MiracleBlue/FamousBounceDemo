define("core/models/timeSync", function(require) {
	var clockMachine = require("core/models/clockMachine");

	var TimeSync = Backbone.Model.extend({
		defaults: {
			lastSyncTime: null,
			currentTime: null,

			timeDrift: null,

			adjustedTime: null,

			events: null
		},
		initialize: function() {
			var self = this;
			var count = 0;
			// Resync after this time
			var resyncAfterCount = 30;
			this.syncTime(function() {
				clockMachine.addCallback(function() {
					self.set("currentTime", self.get("currentTime") + 1000);
					self.set("adjustedTime", Date.now() + self.get("timeDrift"));
					if (count < resyncAfterCount) count++;
					else {
						count = 0;
						self.syncTime();
					}
				});
			});

		},
		syncTime: function(cb) {
			var self = this;
			PUBNUB.time(function(timetoken) {
				var newTimestamp = Math.round(timetoken / 10000);
				self.set("lastSyncTime", newTimestamp);
				self.set("currentTime", newTimestamp);
				self.set("adjustedTime", Math.round((timetoken - (new Date().getTime() * 10000))/10000));
				if (cb) cb(newTimestamp);
			});
		}
	});

	return new TimeSync();
});