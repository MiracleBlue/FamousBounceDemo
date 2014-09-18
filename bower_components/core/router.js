define("core/router", function(require) {
	return function(opts) {
		var Router = Backbone.Router.extend({
			initialize: function(options) {
				var self = this;

				_(opts.events).forOwn(function(item, key) {
					self.on(key, item);
				});

				for (var i = 0; i < opts.routes.length; i++) {
					this.route.apply(this, opts.routes[i]);
				}

				this.route("default", "home");
				Backbone.history.start();
			}
		});

		return new Router();
	}

});