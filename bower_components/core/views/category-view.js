define("core/views/category-view", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var Fader = require("famous/modifiers/Fader");
	var GridLayout = require("famous/views/GridLayout");
	var FlexibleLayout = require("famous/views/FlexibleLayout");
	var HeaderFooterLayout = require("famous/views/HeaderFooterLayout");
	var Transform = require("famous/core/Transform");
	var TransitionableTransform = require("famous/transitions/TransitionableTransform");

	var Button = require("../button");
	var ViewModel = require("../view-model");
	var SideBarGrid = require("core/components/sideBarGrid");

	// Data source service!
	var informant = require("core/informant");

	function fixRotate() {
		$(".rotate").each(function() {
			var el = $(this);
			var w = el.parent().width();
			var h = el.parent().height();

			el.height(w);
			el.width(h);

			el.css("marginTop", (h) + "px");
			el.css("lineHeight", (w) + "px");
		});
	}

	var CategoryView = ViewModel.extend({
		defaults: {
			name: "category",
			active: false,
			// Should be reset after navigating away from this page
			buttonSurfaces: null,
			categoryButtons: null,
			currentGrid: "New"
		},
		events: {
			"change:active": function() {

			}
		},
		initialize: function() {
			this.callSuper();
			var self = this;

			// Utility Functions
			function clearToggledSurfaces() {
				if (buttons.length > 0) {
					_(buttons).each(function(item) {
						if (item.toggled) item.toggle();
					});
				}
			}

			function checkToggledSurfaces() {
				var toggled = false;
				if (buttons.length > 0) {
					_(buttons).each(function(item) {
						if (toggled) return;
						if (item.toggled) toggled = true;
					});
				}
				return toggled;
			}

			var currentGrid = null;
			function toggleGridVisibility(name, immediate) {
				if (!name) name = currentGrid || "New";
				self.set("currentGrid", name);
				currentGrid = name;
				_(workCategoryLayouts).each(function(item) {
					if (item.customerType === name) {
						item.show(immediate);
					}
					else item.hide(immediate);
				});
				if (!immediate) {
					_(customerTypeButtons).forOwn(function(item, key) {
						if (item.toggled) item.toggle();
					})
				}
			}

			var buttons = [];

			// Views and containers
			var views = {
				main: new View(),
				header: new View(),
				footer: new View(),
				content: new View()
			};

			// Modifiers
			var modifiers = {
				fader: new Fader({

				}),
				align: new Modifier({
					align: [0.5, 0.5],
					origin: [0.5, 0.5],
					size: [undefined, undefined]
				})
			};

			// This is a very complicated set of code that basically takes the data structures
			// given to us via the informant. PLEASE REFACTOR
			var workCategoryLayouts = [];

			// Colour list
			var colourList = ["#EBEBEB", "#F4F8F0", "#FEF5CC", "#F4F4F4"];

			/**
			 * Create Bingo Squares!
			 */
			_(informant.get("customerCategories")).forOwn(function(item, key) {
				var output = {
					customerType: key,
					ratios: [],
					flex: null,
					modifier: new Modifier({
						transform: Transform.translate(-informant.get("appWidth"), 0, 0)
					}),
					view: new View(),
					children: [],
					show: function(immediate) {
						this.modifier.halt();
						this.modifier.setTransform(Transform.translate(0, 0, 0), {
							duration: (immediate ? 0 : informant.get("appWidth") / 3),
							curve: "easeInOut"
						});
					},
					hide: function(immediate) {
						this.modifier.halt();
						this.modifier.setTransform(Transform.translate(-informant.get("appWidth"), 0, 0), {
							duration: (immediate ? 0 : informant.get("appWidth") / 3),
							curve: "easeInOut"
						});
					}
				};

				// Dummy ratio numbers for calculations later on
				var totalGridHeight = 0;

				var numberOfSubCategories = item.length;

				var count = 0;

				// All the main category types for this customer type (sales, service, admin, troubleshooting)
				_(item).each(function(subItem) {
					// Collect all the category buttons
					var categoryButtons = [];

					// Iterate over all the categories for this type and make buttons
					_(informant.get("workCategories")[subItem]).each(function(workCategoryChild) {
						// Bingo Square
						var newButton = new Button({
							content: workCategoryChild.Name,
							size: [undefined, undefined],
							classes: ["bingo-square"],
							properties: {
								border: "1px solid #F2F2F0",
								borderRadius: "none",
								textAlign: "center",
								backgroundColor: informant.get("workCategoryColours")[subItem]
							},
							toggleProperties: {
								backgroundColor: "#9C2AA0" // Purple toggle
							}
						}, {
							"click": function(parent) {
								if (!parent.toggled) {
									informant.get("currentInteraction").addCategory(workCategoryChild);
								}
								else {
									informant.get("currentInteraction").removeCategory(workCategoryChild);
								}
								parent.toggle();
							}
						});
						buttons.push(newButton);
						categoryButtons.push(newButton.view)
					});

					// Create grid, add category buttons
					var maxGridHeight = Math.ceil(categoryButtons.length / 3);

					if (numberOfSubCategories === 1) {
						// If there's only one, we should make some space to make the buttons squish into a nice size
						// instead of expanding the entire view height which looks weird
						output.ratios.push((maxGridHeight));
						output.ratios.push(8 - (maxGridHeight));
						totalGridHeight = 8;
					}
					else {
						totalGridHeight += maxGridHeight;
						output.ratios.push(maxGridHeight);
					}

					// Create the grid with all our values!
					var newGrid = new SideBarGrid({
						colour: informant.get("workCategoryColours")[subItem],
						title: subItem,
						items: categoryButtons,
						dimensions: [3, maxGridHeight]
					});
					// Uses .get("view") instead of .view because buttons are not backbone models
					// while the grid hybrid things are... that's my bad.
					output.children.push(newGrid.get("view"));

					count++;
				});

				if (output.children.length === 1) {
					// Here we add an invisible view to make a buffer for a single grid
					// so the buttons remain a reasonable size
					output.children.push(new View());
				}

				// Create container flex for this
				output.flex = new FlexibleLayout({
					ratios: output.ratios,
					direction: 1
				});

				// Sequence children
				output.flex.sequenceFrom(output.children);

				// Connect views
				output.view.add(output.modifier).add(output.flex);

				// Send the output object to our layouts array!
				workCategoryLayouts.push(output);
			});
			this.set("categoryButtons", buttons);
			// End really complicated code for laying out all the category selectors

			// Layouts
			var layouts = {
				headerFooter: new HeaderFooterLayout(),
				headerFooterFlex: new FlexibleLayout({
					ratios: [1, 8, 1],
					direction: 1
				}),
				headerGrid: new GridLayout({
					dimensions: [3, 1]
				}),
				footerGrid: new GridLayout({
					dimensions: [2, 1]
				})
			};

			var customerTypeButtons = {
				// Customer Type Selector
				newButton: new Button({
					content: "New",
					activeGroup: "customer-type",
					size: [undefined, undefined],
					classes: ["grey-bg", "new-btn", "customer-type"],
					properties: {
						border: "none",
						borderRadius: "none"
					}
				}, {
					"click": function(parent) {
						if (checkToggledSurfaces()) return;
						toggleGridVisibility(this.getContent());
						parent.toggle();
					}
				}),
				existingButton: new Button({
					content: "Existing",
					activeGroup: "customer-type",
					classes: ["grey-bg", "existing-btn", "customer-type"],
					size: [undefined, undefined],
					properties: {
						border: "none",
						borderRadius: "none"
					}
				}, {
					"click": function(parent) {
						if (checkToggledSurfaces()) return;
						toggleGridVisibility(this.getContent());
						parent.toggle();
					}
				}),
				adminButton: new Button({
					content: "Admin",
					activeGroup: "customer-type",
					classes: ["grey-bg", "admin-btn", "customer-type"],
					size: [undefined, undefined],
					properties: {
						border: "none",
						borderRadius: "none"
					}
				}, {
					"click": function(parent) {
						if (checkToggledSurfaces()) return;
						toggleGridVisibility(this.getContent());
						parent.toggle();
					}
				})
			}

			// Surfaces and buttons
			var surfaces = {

				// Control Buttons
				cancelButton: new Button({
					content: "Cancel",
					classes: ["grey-bg"],
					size: [undefined, undefined],
					properties: {
						border: "none",
						borderRadius: "none"
					}
				}, {
					"click": function() {
						informant.navigateTo("tracking");
					}
				}),
				finishButton: new Button({
					content: "Finish",
					classes: ["grey-bg"],
					size: [undefined, undefined],
					properties: {
						border: "none",
						borderRadius: "none"
					}
				}, {
					"click": function() {

						if(informant.get("currentInteraction").get("categories").length < 1) {
							alert("You need to enter some categories.");
							return;
						}
						informant.get("currentInteraction").set("customerType", self.get("currentGrid"));
						informant.get("currentInteraction").end();
						informant.set("tracking", false);
						informant.completeInteraction();
						informant.navigateTo("tracking");
					}
				})
			};

			this.set("buttonSurfaces", surfaces);
			this.set("customerTypeButtons", customerTypeButtons);

			workCategoryLayouts[0].show();

			// Add header buttons to header
			layouts.headerGrid.sequenceFrom([
				customerTypeButtons.newButton.view,
				customerTypeButtons.existingButton.view,
				customerTypeButtons.adminButton.view
			]);

			// Add header buttons to header
			layouts.footerGrid.sequenceFrom([
				surfaces.cancelButton.view,
				surfaces.finishButton.view
			]);

			// Connect header, content, and view
			views.header.add(layouts.headerGrid);
			_(workCategoryLayouts).each(function(item) {
				views.content.add(item.view);
			});
			views.footer.add(layouts.footerGrid);

			// Sequence into flex layout
			layouts.headerFooterFlex.sequenceFrom([
				views.header,
				views.content,
				views.footer
			]);

			// Connect to main output
			views.main.add(modifiers.align).add(layouts.headerFooterFlex);

			// Add to view node
			this.addNode(views.main);

			this.renderView();

			this.hide();

			customerTypeButtons.newButton.toggle();

			// Set some closured methods
			this.onShow = function() {
				toggleGridVisibility(null, true);
			};
			this.onHide = function() {
				toggleGridVisibility(null, true);
			};

			// Routing table
			this.set("routes", [
				["category", "category", function() {
					// Route definition
					self.set("active", true);

					informant.set("confirmNavigation", function() {
						clearToggledSurfaces();
						informant.cancelInteraction();
						informant.set("confirmNavigation", false);
					});

					clearToggledSurfaces();

					informant.set("backButtonRoute", "tracking");
					informant.set("backButtonCallback", function() {
						clearToggledSurfaces();
						informant.cancelInteraction();
						informant.set("confirmNavigation", false);
					});

					fixRotate();

					toggleGridVisibility("New");
					if (!customerTypeButtons.newButton.toggled) customerTypeButtons.newButton.toggle();
				}]
			]);

		},
		constructView: function() {

		},
		onResize: function(size) {
			if (this.get("categoryButtons")) {
				_(this.get("categoryButtons")).each(function(item) {
					if (item.resize) item.resize(size);
				});
			}
			if (this.get("customerTypeButtons")) {
				_(this.get("customerTypeButtons")).each(function(item) {
					if (item.resize) item.resize(size);
				});
			}

			fixRotate();
		}

	});

	return CategoryView;
});