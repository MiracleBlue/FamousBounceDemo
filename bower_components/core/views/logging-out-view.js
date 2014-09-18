define("core/views/logging-out-view", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var Transform  = require('famous/core/Transform');
	var StateModifier = require('famous/modifiers/StateModifier');
	var FlexibleLayout = require("famous/views/FlexibleLayout");
	var GridLayout = require("famous/views/GridLayout");
	var Group = require("famous/core/Group");

	var Button = require("../button");
	var ViewModel = require("../view-model");

	var informant = require("core/informant");

	var LoggingOutView = ViewModel.extend({
		defaults: {
			name: "loggingout",
			active: false
		},
		initialize: function() {
			this.callSuper();

			var self = this;

			var mainView = new View();
			var alignModifier = new Modifier();

			// All people
			var loggingOutContainer = new View();
			var loggingOutSurface = new Surface({
				size: [undefined, undefined],
				content: "<h1>Please wait while we log you out of SalesForce</h1><div class='loading-gif'></div>",
				properties: {
					textAlign: "center",
					paddingTop: "100px",
					paddingLeft: "20px",
					paddingRight: "20px"
				}
			});

			loggingOutContainer.add(loggingOutSurface);

			mainView.add(loggingOutContainer);

			var nameSurface = new Surface({
				content: informant.get("userName"),
				size: [undefined,40],
				properties: {
					paddingRight:"20px",
					fontSize: "24px",
					lineHeight: "40px",
					color:"#000",
					textAlign: "right"

				}
			});

			mainView.add(nameSurface);

			this.addNode(mainView);

			this.renderView();
			this.hide();

			this.set("routes", [
				["loggingout", "loggingout", function() {
					self.set("active", true);

					informant.set("backButtonRoute", "loggingout");
					informant.set("backButtonCallback", function() {});
				}]
			]);
		}

	});

	return LoggingOutView;
});
