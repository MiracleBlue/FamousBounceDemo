define("core/views/home-view", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var GridLayout = require("famous/views/GridLayout");

	var Button = require("../button");
	var ViewModel = require("../view-model");

	var informant = require("core/informant");

	var BUTTON_SIZES = {
		CONTROLS: {
			LARGE: [undefined, 100],
			MEDIUM: [undefined, 80],
			SMALL: [undefined, 50]
		}
	};

	var HomeView = ViewModel.extend({
		defaults: {
			name: "home",
			active: false
			
		},
		initialize: function() {
			this.callSuper();

			var self = this;

			var nameSurface = new Surface({
				content: informant.get("userName"),
				size: [undefined,40],
				properties: {
					paddingRight:"20px",
					fontSize: "24px",
					lineHeight: "40px",
					color:"#000",
					textAlign: "right",
					zIndex:10000
				}
			});


			this.set("routes", [
				["home", "home", function() {
					self.set("active", true);
					nameSurface.setContent(informant.get("userName"));
					informant.set("backButtonRoute", "home");
					informant.set("backButtonCallback", function() {});
				}]
			]);

			// Background surface
			var backgroundSurface = new Surface({
				classes: ["background-surface"],
				size: [undefined, undefined]
			});

			// Buttons
			var beginShiftButton = new Button({
				content: "Begin Shift",
				centerView: true,
				sizeList: BUTTON_SIZES.CONTROLS,
				size: [undefined, 100],
				properties: {
					boxShadow: "1px 1px 3px #888888"
				}
			}, {
				"click": function() {
					//check for pub nub otherwise return alert.
					informant.navigateTo("login");
				}
			});
			/*
			var myStatsButton = new Button({
				content: "My Stats",
				centerView: true,
				sizeList: BUTTON_SIZES.CONTROLS,
				size: [undefined, 100],
				properties: {
					boxShadow: "1px 1px 3px #888888"
				}
			}, {
				"click": function(parent) {
					informant.navigateTo("reporting");
				}
			});*/
			var learnButton = new Button({
				content: "Learn",
				centerView: true,
				sizeList: BUTTON_SIZES.CONTROLS,
				size: [undefined, 100],
				properties: {
					boxShadow: "1px 1px 3px #888888"
				}
			}, {
				"click": function() {
					// Link to learn documents here
				}
			});

			this.set("buttonSurfaces", {
				beginShiftButton: beginShiftButton,
				//myStatsButton: myStatsButton,
				learnButton: learnButton
			});

			// View list
			var views = {
				topleft: new View(),
				topright: new View(),
				bottomleft: new View(),
				bottomright: new View()
			};

			// Button Grid
			var buttonGrid = new GridLayout({
				dimensions: [1, 3]
			});
			buttonGrid.sequenceFrom([
				beginShiftButton.view,
				//myStatsButton.view,
				learnButton.view
			]);

			views.bottomright.add(buttonGrid);

			// Main View
			var mainViewContainer = new View();
			var mainView = new GridLayout({
				dimensions: [2, 2]
			});
			mainView.sequenceFrom([
				views.topleft,
				views.topright,
				views.bottomleft,
				views.bottomright
			]);
			mainViewContainer.add(backgroundSurface);
			mainViewContainer.add(mainView);

			mainViewContainer.add(nameSurface);

			this.addNode(mainViewContainer);

			this.renderView();
			this.hide();
		}

	});

	return HomeView;
});
