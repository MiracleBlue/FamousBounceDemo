define("core/views/add-to-queue-view", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var Transform  = require('famous/core/Transform');
	var StateModifier = require('famous/modifiers/StateModifier');
	var FlexibleLayout = require("famous/views/FlexibleLayout");
	var GridLayout = require("famous/views/GridLayout");
	var Group = require("famous/core/Group");
	var InputSurface = require("famous/surfaces/InputSurface");

	var Button = require("../button");
	var ViewModel = require("../view-model");

	var informant = require("core/informant");
	var timeSync = require("core/models/timeSync");

	var BUTTON_SIZES = {
		TOGGLES: {
			LARGE: [250, 100],
			MEDIUM: [180, 80],
			SMALL: [120, 50]
		},
		CONTROLS: {
			LARGE: [400, 100],
			MEDIUM: [300, 80],
			SMALL: [200, 50]
		}
	};

	var AddToQueueView = ViewModel.extend({
		defaults: {
			name: "addtoqueue",
			active: false
		},
		initialize: function() {
			this.callSuper();

			var self = this;
			var surfaces;

			this.set("routes", [
				["addtoqueue", "addtoqueue", function() {
					self.set("active", true);
					informant.set("backButtonRoute", "tracking");
					informant.set("backButtonCallback", function() {});
					if (surfaces.newCustomerButton.toggled) surfaces.newCustomerButton.toggle();
					if (surfaces.existingCustomerButton.toggled) surfaces.existingCustomerButton.toggle();
					surfaces.inputSurface.focus();
				}]
			]);

			var mainView = new View();
			var alignModifier = new Modifier();

			// Back button
			var backButtonContainer = new View();
			var backButtonModifier = new Modifier({
				align: [0.5, 1],
				origin: [0.5, 1],
				size: [250, 110]
			});
			var backButton = new Button({
				content: "Cancel",
				size: [undefined, undefined],
				classes: ["back-btn"],
				properties: {
					borderRadius: "none"
				}
			}, {
				"click": function() {
					informant.navigateTo("tracking");
				}
			});

			backButtonContainer.add(backButtonModifier).add(backButton.view);

			// All people
			var peopleContainer = new View();
			surfaces = {
				inputSurface: new InputSurface({
					size: [undefined, 70],
					properties: {
						border: "2px solid #cccccc",
						backgroundColor: "white",
						fontSize: "30px",
						boxShadow: "inset 3px 3px 3px #cccccc",
						borderRadius: "5px",
						paddingLeft: "15px",
						outlineColor: "#428600"
					}
				}),
				newCustomerButton: new Button({
					content: "New",
					sizeList: BUTTON_SIZES.TOGGLES,
					centerView: true,
					classes: ["back-btn"],
					properties: {
						borderRadius: "none"
					}
				}, {
					"click": function(parent) {
						parent.toggle();
						if (surfaces.existingCustomerButton.toggled) surfaces.existingCustomerButton.toggle();
					}
				}),
				existingCustomerButton: new Button({
					content: "Existing",
					sizeList: BUTTON_SIZES.TOGGLES,
					centerView: true,
					classes: ["back-btn"],
					properties: {
						borderRadius: "none"
					}
				}, {
					"click": function(parent) {
						parent.toggle();
						if (surfaces.newCustomerButton.toggled) surfaces.newCustomerButton.toggle();
					}
				}),
				addButton: new Button({
					content: "Add",
					sizeList: BUTTON_SIZES.CONTROLS,
					classes: ["back-btn"],
					centerView: true,
					properties: {
						borderRadius: "3px",
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
				//TODO add workentry for queueing here NLK
					"click": function(parent) {
					
						if(surfaces.inputSurface.getValue() == undefined || surfaces.inputSurface.getValue() == "") {
							alert("Try entering a name next time.");
							return;
						}
						if (!surfaces.newCustomerButton.toggled && !surfaces.existingCustomerButton.toggled) {
							alert("Please select a customer type: New or Existing.");
							return;
						}
						informant.get("hostingManager").get("connector").add(surfaces.inputSurface.getValue(), timeSync.get("currentTime"));
						informant.get("currentInteraction").end();
						informant.completeQueueInteraction(0);
						informant.navigateTo("tracking");
						surfaces.inputSurface.setValue("");
					}
				}),
				cancelButton: new Button({
					content: "Cancel",
					sizeList: BUTTON_SIZES.CONTROLS,
					classes: ["back-btn"],
					centerView: true,
					properties: {
						borderRadius: "3px",
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function(parent) {
						surfaces.inputSurface.setValue("");
						//informant.get("hostingManager").get("connector").add(surfaces.inputSurface.getValue(), (surfaces.existingCustomerButton.toggled ? "existing" : "new"));
						informant.get("currentInteraction").end();
						informant.completeQueueInteraction(1);
						informant.resumeInteraction(informant.get("oldInteraction"));
						informant.navigateTo("tracking");
					}
				})
			};

			this.set("buttonSurfaces", surfaces);

			// Bottom Grid
			var bottomGrid = new GridLayout({
				dimensions: [1, 2]
			});
			bottomGrid.sequenceFrom([
				surfaces.addButton.view,
				surfaces.cancelButton.view
			]);
			var bottomGridModifier = new Modifier({
				align: [0.5, 0.5],
				origin: [0.5, 0.5],
				size: [250, undefined]
			});
			var bottomGridView = new View();
			bottomGridView.add(bottomGridModifier).add(bottomGrid);

			// Top grid
			var newExistingGrid = new GridLayout({
				dimensions: [2, 1]
			});
			newExistingGrid.sequenceFrom([
				surfaces.newCustomerButton.view,
				surfaces.existingCustomerButton.view
			]);

			var topGrid = new GridLayout({
				dimensions: [1, 2]
			});
			topGrid.sequenceFrom([
				surfaces.inputSurface,
				newExistingGrid
			]);
			var topGridModifier = new Modifier({
				align: [0.5, 0.5],
				origin: [0.5, 0.5],
				size: [undefined, 250]
			});
			var topGridView = new View();
			topGridView.add(topGridModifier).add(topGrid);

			var flexLayout = new FlexibleLayout({
				ratios: [5, 2],
				direction: 1
			});

			flexLayout.sequenceFrom([
				topGridView,
				bottomGridView
			]);


			peopleContainer.add(flexLayout);

			mainView.add(peopleContainer);

			var nameSurface = new Surface({
				content: informant.get("userName"),
				size: [undefined,40],
				properties: {
					paddingRight:"20px",
					fontSize: "24px",
					lineHeight: "40px",
					color:"#000",
					textAlign:"right"
				}
			});
			mainView.add(nameSurface);

			this.addNode(mainView);

			this.renderView();
			this.hide();
		}

	});

	return AddToQueueView;
});
