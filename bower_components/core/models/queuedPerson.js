define("core/models/queuedPerson", function(require) {
	return Backbone.Model.extend({
		defaults: {
			name: "Jane Doe",
			timeAdded: 0
		}
	});
});