define("core/views-collection", function(require) {
	var ViewModel = require("core/view-model");

	var ViewCollection = Backbone.Collection.extend({
		model: ViewModel
	});

	return ViewCollection;
});