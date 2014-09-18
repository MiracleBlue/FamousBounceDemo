define("core/collections/interactions", function(require) {
	var Interaction = require("core/models/interaction");
	return Backbone.Collection.extend({
		model: Interaction
	});
});