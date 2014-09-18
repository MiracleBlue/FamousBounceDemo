define("core/models/clockMachine", function(require) {
	var Timer = require("famous/utilities/Timer");

	var ClockMachine = Backbone.Model.extend({
		defaults: {
			callbacks: null,
			timerObject: null,
			useFamousTimer: false
		},
		initialize: function() {
			this.set("callbacks", []);
			if (this.get("useFamousTimer")) this.set("timerObject", Timer.setInterval(this.runCallbacks.bind(this), 1000));
			else this.set("timerObject", setInterval(this.runCallbacks.bind(this), 1000));
		},
		addCallback: function(callback) {
			var callbacks = this.get("callbacks");
			var id = callbacks.push(callback);
			this.set("callbacks", callbacks);
			return id;
		},
		runCallbacks: function() {
			_(this.get("callbacks")).each(function(callback) {
				callback();
			});
		}
	});

	return new ClockMachine();
});