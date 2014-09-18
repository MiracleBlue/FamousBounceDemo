define("core/views/login-view", function(require) {
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
	var ListComponent = require("core/components/list");

	var informant = require("core/informant");

	var LoginView = ViewModel.extend({
		defaults: {
			name: "login",
			active: false,
			recentStores: [
				{name: "Chatswood", code: "P00015"},
				{name: "North Sydney", code: "P00015"},
			],
			allStores: [
				{name: "Blah", code: "P00015"},
				{name: "Thing", code: "P00015"},
				{name: "Testing", code: "P00015"},
				{name: "Whatever", code: "P00015"},
				{name: "Derp", code: "P00015"}
			]
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
					textAlign: "right"
					
				}
			});

			this.set("routes", [
				["login", "login", function() {
				
					if(informant.get("currentStore") != null){
						nameSurface.setContent(informant.get("userName") + " - " 
								+ informant.get("currentStore")[[Object.keys(informant.get("currentStore"))[0]]]);
					}
					self.set("active", true);
					
					informant.set("backButtonRoute", "home");
					informant.set("backButtonCallback", function() {});
					backButton.resize(informant.get("currentSize"));
				}]
			]);

			if(informant.get("forceConnector").getRecentStores() != undefined || informant.get("forceConnector").getRecentStores() != null)
					this.set("recentStores", informant.get("forceConnector").getRecentStores());
			this.set("allStores", informant.get("forceConnector").getAllStores());

			var mainView = new View();
			var alignModifier = new Modifier();

			var flexContainer = new FlexibleLayout({
				ratios: [7, 2],
				direction: 1
			});

			// Back button
			var backButtonContainer = new View();
			var backButtonModifier = new Modifier({
				align: [0.5, 1],
				origin: [0.5, 1],
				size: [undefined, 110]
			});
			var backButton = new Button({
				content: "Back",
				size: [undefined, undefined],
				classes: ["back-btn", "dark-grey-bg"],
				enableBounce: false,
				properties: {
					borderRadius: "none",
					borderTop: "10px solid #f2f2f0",
					fontSize: "40px"
				}
			}, {
				"click": function() {
					informant.navigateTo("home");
				}
			});

			backButtonContainer.add(backButtonModifier).add(backButton.view);

			// All Stores
			var allStoresList;
			var allStoresContainer = new View();

			var currentlyScrolling = false;

			var allStores = [
				new Surface({
					content: "Recent Stores",
					classes: ["title-surface"],
					size: [undefined, 99],
					properties: {
						color: "black",
						textAlign: "center",
						lineHeight: "100px",
						borderBottom: "1px solid #FF9191",
						fontSize: "40px"
					}
				})
			];

			_(this.get("recentStores")).each(function(item) {
				var wrappedItem = new Button({
					content: item.StoreCode__c,
					size: [undefined, 99],
					convertClickToTouch: true,
					enableBounce: false,
					properties: {
						borderRadius: "none",
						borderBottom: "1px solid #FF9191",
						fontSize: "40px"
					}
				}, {
					"click": function() {
						if (currentlyScrolling) return;
						informant.set("currentStore", {code: item.StoreCode__c});
						informant.startShift();
						informant.navigateTo("tracking");

					}
				});
				allStores.push(wrappedItem);
			});

			allStores.push(
				new Surface({
					content: "All Stores",
					classes: ["title-surface"],
					size: [undefined, 99],
					properties: {
						color: "black",
						textAlign: "center",
						lineHeight: "100px",
						borderBottom: "1px solid #FF9191",
						fontSize: "40px"
					}
				})
			);

			_(this.get("allStores")).each(function(item) {
				var wrappedItem = new Button({
					content: item.sf_StoreCode__c,
					size: [undefined, 99],
					convertClickToTouch: true,
					enableBounce: false,
					properties: {
						borderRadius: "none",
						borderBottom: "1px solid #FF9191",
						fontSize: "40px"
					}
				}, {
					"click": function() {
						if (currentlyScrolling) return;
						informant.set("currentStore", {code: item.sf_StoreCode__c});
						informant.startShift();
						informant.navigateTo("tracking");
					}
				});
				allStores.push(wrappedItem);
			});

			allStoresList = new ListComponent({
				list: allStores
			});

			// Set events for scrollView

			allStoresList.get("scroller").on("scrollEnd", function() {
				currentlyScrolling = false;
			});
			allStoresList.get("scroller").on("scrollMove", function() {
				currentlyScrolling = true;
			})


			allStoresContainer.add(allStoresList.get("view"));

			mainView.add(allStoresContainer);
			// Groups always get added last to the DOM, so this means that
			// the scrollview will always be above surfaces.
			// To hack around this, I've wrapped my button surface in a group
			// so that it should get added in the right order, without setTimeout
			var groupHack = new Group();
			groupHack.add(backButtonContainer);
			mainView.add(groupHack);
			//mainView.add(backButtonContainer);


			mainView.add(nameSurface);

			this.addNode(mainView);

			this.renderView();
			this.hide();
		}

	});

	return LoginView;
});
