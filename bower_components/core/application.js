define("core/application", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var HeaderFooterLayout = require("famous/views/HeaderFooterLayout");
	var GridLayout = require("famous/views/GridLayout");
	var View = require("famous/core/View");

	var Modifier = require("famous/core/Modifier");
	var ViewSequence = require("famous/views/SequentialLayout");
	var FlexibleLayout = require("famous/views/FlexibleLayout");

	var Button = require("core/button");
	var Router = require("core/router");

	// Views
	var ViewCollection = require("core/views-collection");
	var LoginView = require("core/views/login-view");
	var HomeView = require("core/views/home-view");
	var TrackingView = require("core/views/tracking-view");
	var CategoryView = require("core/views/category-view");
	var QueueView = require("core/views/queue-view");
	var AddToQueueView = require("core/views/add-to-queue-view");
	var ReportingView = require("core/views/reporting-view");
	var LoggingOutView = require("core/views/logging-out-view");

	// Data provider
	var informant = require("core/informant");

	// time difference between pobnub and localtime


	if (typeof sforce === "undefined") {
		console.error("sforce is not defined!");
		alert("Error: sforce is not defined!");
	}
	// test again twg
	var App = function() {
		var self = this;
		// View instances

		var mainContext = Engine.createContext();
		this.views = new ViewCollection([
			new LoginView(),
			new HomeView(),
			new TrackingView(),
			new CategoryView(),
			new QueueView(),
			new AddToQueueView(),
			new ReportingView(),
			new LoggingOutView()
		]);

		informant.set("views", this.views);

		// Construct router routes
		var routes = [];
		this.views.each(function(val) {
			mainContext.add(val.get("view"));
			_(val.get("routes")).each(function(item) {
				routes.push(item)
			});
		});

		this.router = Router({
			routes: routes,
			events: {
				"route": function(name) {
					_(self.views.where({active: true})).each(function(item) {
						if (item.get("name") !== name) {
							item.set("active", false);
						}

					});
				}
			}
		});

		this.context = mainContext;
		informant.resizeViews();
		setTimeout(function() {
			informant.resizeViews();
		}, 500);
	};

	window.app = new App();
	window.informant = informant;

});