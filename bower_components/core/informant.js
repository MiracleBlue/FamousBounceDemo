define("core/informant", function(require) {

	var Interaction = require("core/models/interaction");
	var HostingManager = require("core/models/hostingManager");
	var Timer = require("famous/utilities/Timer");

	var Informant = Backbone.Model.extend({
		defaults: {
			// User information
			userId: null,
			sessionId: null,
			userName: null,
			// Server
			forceConnector: null,
			// App stuff
			appWidth: null,
			appHeight: null,
			sizes: {
				"LARGE": [0, 0],
				"MEDIUM": [600, 1100],
				"SMALL": [500, 900]
			},
			currentSize: "LARGE",
			currentRoute: "home",
			previousRoute: null,
			views: null,
			// Interactio information
			startShiftTime: 0,
			endShiftTime: 0,
			currentInteraction: null,
			oldInteraction: null,
			currentStore: null,
			tracking: false,
			// Work/Customer categories
			customerCategories: {
				"New": ["Sale - New"],
				"Existing": ["Sale - Existing", "Service", "Troubleshooting"],
				"Admin": ["Admin"]
			},
			queueCategories: null,
			workCategories: null,
			// This aligns work categories to their colours
			workCategoryColours: null,
			abortCategory: null,
			// Salesforce connection status
			online: false,

			// Hosting
			hostingMode: false,
			hostingManager: null,
			currentPerson: null,
			nextPerson: null,
			// Navigation
			confirmNavigation: false,
			// Borrowed from http://stackoverflow.com/questions/3974827/detecting-touch-screen-devices-with-javascript
			isTouchDevice: 'ontouchstart' in document.documentElement || 'ontouchstart' in window,
			backButtonRoute: "home",
			backButtonCallback: function(){},
		},
		initialize: function(){
			var self = this;
			this.set("sessionId", sforce.connection.sessionId);
			this.set("userId", sforce.connection.getUserInfo().userId);
			this.set("userName", sforce.connection.getUserInfo().userFullName);
			this.set("appWidth", window.innerWidth);
			this.set("appHeight", window.innerHeight);
			this.set("forceConnector", new PowerUpForce(this.get("userId")));
			this.set("hostingManager", new HostingManager());

			var rawCategoryData = this.get("forceConnector").getCategories();
			var rawQueueCategoryData = this.get("forceConnector").getQueueCategories();

			var queueCategories = [];

			var count = 0;

			_(rawQueueCategoryData).each(function(item) {
				queueCategories[count] = item;
				count++;
			});
			this.set("queueCategories", queueCategories);

			var workCategories = {};
			var workCategoryColours = {};

			_(rawCategoryData).each(function(item) {
				var categoryName = item["Category__c"];
				if (typeof categoryName !== "string") categoryName = "System";
				if (typeof workCategories[categoryName] === "undefined") workCategories[categoryName] = [];

				workCategories[categoryName].push(item);
				workCategoryColours[categoryName] = item["CategoryColor__c"];

				if (item["Name"] === "Abort") self.set("abortCategory", item);
			});

			this.set("workCategories", workCategories);
			this.set("workCategoryColours", workCategoryColours);

			// Listen to hash change, views set a back button location
			window.addEventListener("hashchange", function() {
				if (window.location.hash.split("#")[1] !== self.get("backButtonRoute")) {
					self.navigateTo(self.get("backButtonRoute"));
					self.get("backButtonCallback")();
				}
			}, false);

			// Resize logic
			window.addEventListener("resize", function() {
				self.resizeViews();
			});

			window.addEventListener("orientationchange", function() {
				Timer.setTimeout(function() {
					self.resizeViews();
				}, 300);
			});

			// Listen for a store to be selected
			this.on("change:currentStore", function() {
				if (self.get("currentStore")) self.get("hostingManager").createChannel();
			});

			// Final init
			// When initialised, we should probably navigate to the home screen
			this.navigateTo("home");
		},
		resizeViews: function() {
			var self = this;
			var width = window.innerWidth;
			var height = window.innerHeight;
			var bodyEl = $("body");

			this.set("appWidth", width);
			this.set("appHeight", height);

			var size = "LARGE";

			_(this.get("sizes")).forOwn(function(item, key) {
				if (width <= item[0]) size = key;
				if (height <= item[1]) size = key;
			});

			if (this.get("views")) {
				this.get("views").each(function(item) {
					item.resize(size);
				});
			}

			var sizeLower = size.toLowerCase();

			if (size !== this.get("currentSize")) {
				bodyEl.removeClass("size-" + (this.get("currentSize").toLowerCase()));
			}
			if (!bodyEl.hasClass("size-" + sizeLower)) bodyEl.addClass("size-" + sizeLower);

			this.set("currentSize", size);

		},
		registerListener: function(name, callback) {
			// Pretty much works one-way, can't remove these because there's no need
			// If you need to be able to remove these, just implement it
			this.on(name, callback);
		},
		navigateTo: function(route) {
			this.set("previousRoute", this.get("currentRoute"));
			this.set("backButtonRoute", route);
			window.location.hash = "#" + route;
			this.set("currentRoute", route);
		},
		// Interactions!
		createInteraction: function() {
			var interaction = new Interaction();
			this.set("currentInteraction", interaction);
			var self = this;
			interaction.on("change:timeStart", function() {
				self.set("tracking", true);
			});
			return interaction;
		},
		completeInteraction: function() {
			var interaction = this.get("currentInteraction");
			var self = this;

			// Send to server, I suppose.  Depending on whether or not we're in online mode.
			this.get("currentInteraction").complete();

			setTimeout(function() {
				self.get("forceConnector").createRecords(
					_.map(interaction.get("categories"), function(item) {
						return item.Id;
					}),
					interaction.get("timeStart"),
					interaction.get("timeEnd"),
					interaction.get("customerType"),
					interaction.get("categories").length
				);
			}, 500);

			console.log("categories", interaction.get("categories"));
			// createRecords: function(worktypeid, userid, starttime, endtime, customertype)

			this.set("tracking", false);

			return this;
		},
		completeQueueInteraction: function(offset) {
			var interaction = this.get("currentInteraction");
			var self = this;

			// Send to server, I suppose.  Depending on whether or not we're in online mode.
			this.get("currentInteraction").complete();

			setTimeout(function() {
				self.get("forceConnector").createRecords(
					informant.get("queueCategories")[offset].Id,
					interaction.get("timeStart"),
					interaction.get("timeEnd"),
					interaction.get("customerType"),
					1
				);
			}, 500);
			// createRecords: function(worktypeid, userid, starttime, endtime, customertype)

			this.set("tracking", false);

			return this;
		},
		cancelInteraction: function() {
			var currentInteraction = this.get("currentInteraction");
			this.set("oldInteraction", currentInteraction);
			//this.createInteraction(); // Create a new one in place of the old one
			this.set("tracking", false);
			return currentInteraction;
		},
		startShift: function() {
			//added time correction
			this.set("startShiftTime", getCorrectedDate(Date.now()));
			this.set("online", true);
			this.get("forceConnector").startShift(this.get("currentStore").code, this.get("startShiftTime"));
		},
		endShift: function() {
			this.set("endShiftTime", getCorrectedDate(Date.now()));
			this.set("online", false);
			this.get("forceConnector").endShift(this.get("currentStore").code, this.get("endShiftTime"), false);

			// Send info to server
			//this.resetModels();
			this.navigateTo("loggingout");
		},
		resetModels: function() {
			this.set("currentInteraction", null);
			this.set("currentStore", null);
			this.set("startShiftTime", 0);
			this.set("endShiftTime", 0);
			this.set("confirmNavigation", false);
			this.set("online", false);
		},
		resumeInteraction: function(interactionModel) {
			this.set("currentInteraction", interactionModel);
			this.set("tracking", true);
			return this;
		},
		// Todo: persistence, when time is available
		storePersist: function() {
			/*var storageObject = {
				currentRoute: this.get("currentRoute"),
				startShiftTime: this.get("startShiftTime"),
				currentStore
			}*/
		}
	});

	// Remove the global after dev
	var informant = new Informant();
	window.informant = informant;
	return informant;

});