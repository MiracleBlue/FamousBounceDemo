define("core/models/user", function(require) {
	return Backbone.Model.extend({
		defaults: {
			id: null,
			startTime: null,
			endTime: null
		}
	});
});