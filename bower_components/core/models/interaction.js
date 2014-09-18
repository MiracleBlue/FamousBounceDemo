define("core/models/interaction", function(require) {
	// This is a model that represents an interaction before it is sent to the server

	return Backbone.Model.extend({
		active: true,
		timeStart: 0,
		timeEnd: 0,
		customerType: "New", // Either "new", "existing", or "admin"
		categories: null, // Array that contains the categories selected for this interaction

		initialize: function() {
			this.set("categories", []); // Set array at construction to avoid prototype reference issue
		},
		addCategory: function(categoryItem) {
			var categoryList = this.get("categories");
			categoryList.push(categoryItem);
			this.set("categories", categoryList);
			return this;
		},
		removeCategory: function(categoryItem) {
			this.set("categories", _(this.get("categories")).without(categoryItem));
			return this;
		},
		start: function() {
			this.set("timeStart", getCorrectedDate(Date.now()));
			return this;
		},
		end: function() {
			this.set("timeEnd", getCorrectedDate(Date.now()));
			return this;
		},
		complete: function() {
			this.set("active", false);
			return this;
		}
	})
});