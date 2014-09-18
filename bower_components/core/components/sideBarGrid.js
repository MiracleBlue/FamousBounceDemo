define("core/components/sideBarGrid", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var ContainerSurface = require('famous/surfaces/ContainerSurface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var GridLayout = require("famous/views/GridLayout");
	var FlexibleLayout = require("famous/views/FlexibleLayout");
	var Transform = require("famous/core/Transform");

	var Button = require("../button");

	var SideBarGrid = Backbone.Model.extend({
		defaults: {
			title: "Test",
			items: null,
			view: null,
			modifier: null,
			colour: null,
			dimensions: [3, 3]
		},
		initialize: function() {
			var self = this;

			var mainView = new View();

			var modifier = new Modifier({
				size: [undefined, undefined]
			});

			var containerView = new View();

			// Sidebar
			var sideBarView = new View();
			var sideBarModifier = new Modifier({
				//transform: Transform.rotateZ(Math.PI)
			});
			var sideBarSurface = new Surface({
				size: [undefined, undefined],
				classes: ["sidebarsurface"],
				content: "<span class='rotate'>" + self.get("title") + "</span>",
				properties: {
					borderTop: "1px solid #fff",
					borderBottom: "1px solid #fff",
					background: self.get("colour"),
					textAlign: "center",
					lineHeight: "100px"
				}
			});
			sideBarView.add(sideBarModifier).add(sideBarSurface);

			// Grid
			var gridView = new View();
			var gridModifier = new Modifier();
			var gridLayout = new GridLayout({
				dimensions: this.get("dimensions")
			});
			gridLayout.sequenceFrom(this.get("items"));
			gridView.add(gridModifier).add(gridLayout);

			// Little separator border
			var separator = new Surface({
				size: [undefined, undefined],
				classes: ["separator"],
				properties: {
					backgroundColor: this.get("colour"),
					borderTop: "1px solid " + this.get("colour")
				}
			});

			// Flex container
			var flexContainer = new FlexibleLayout({
				ratios: [1, 8]
			});
			flexContainer.sequenceFrom([
				sideBarView,
				gridView
			]);

			containerView.add(flexContainer);

			mainView.add(modifier).add(containerView);

			this.set("view", mainView);
			this.set("modifier", modifier);
		}

	});

	return SideBarGrid;
});