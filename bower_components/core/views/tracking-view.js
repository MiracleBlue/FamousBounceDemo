define("core/views/tracking-view", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var FlexibleLayout = require("famous/views/FlexibleLayout");
	var GridLayout = require("famous/views/GridLayout");

	var Transform = require("famous/core/Transform");
	var TransitionableTransform = require("famous/transitions/TransitionableTransform");

	var informant = require("core/informant");

	var clockMachine = require("core/models/clockMachine");
	var timeSync = require("core/models/timeSync");

	var Button = require("../button");
	var ViewModel = require("../view-model");
	var ACTIVE_STATE = 1,
		IDLE_STATE = 0,
		PLAY_ICON = "",
		STOP_ICON = "00:00:00";

	var BUTTON_SIZE = {
		CONTROLS: {
			LARGE: [400, 100],
			MEDIUM: [300, 80],
			SMALL: [200, 50]
		},
		PLAY: {
			LARGE: [400, 400],
			MEDIUM: [300, 300],
			SMALL: [200, 200]
		}
	};

	var TrackingView = ViewModel.extend({
		defaults: {
			name: "tracking",
			active: false,
			state: IDLE_STATE,
			tracking: false,
			currentPerson: null,
			nextPerson: null,
			preventStopTracking: false,
			buttonSurfaces: null,
			mainClockStarted: false
		},
		initialize: function() {
			var self = this;
			window.trackingview = self;
			this.callSuper();
			var clock;

			// Routes
			this.set("routes", [
				["tracking", "tracking", function() {
					self.set("active", true);
					if (!informant.get("tracking")) {
						self.set("currentPerson", null);
						self.set("state", IDLE_STATE)
							.set("tracking", false);

						self.stopClock();
					}
					else {
						if (informant.get("tracking")) {
							self.set("tracking", true);
							self.set("preventStopTracking", false);
							self.startClock();
						}

					}
					nameSurface.setContent(informant.get("userName") + " - <a style='color:black;cursor:pointer' onclick=\"informant.navigateTo('login')\">" 
							+ informant.get("currentStore")[[Object.keys(informant.get("currentStore"))[0]]] + "</a>");

					informant.set("backButtonRoute", "tracking");
					informant.set("backButtonCallback", function() {});
				}]
			]);

			// Events
			this.on("change:tracking", this.trackingChanged);

			// Views and containers
			var views = {
				playerContainer: new View(),
				activeButtonsContainer: new View(),
				idleButtonsContainer: new View(),
				allButtonsContainer: new View(),
				dummyView: new View(),
				nextPersonView: new View(),
				main: new View()
			};

			// Modifiers
			var modifiers = {
				activeButtonsModifier: new Modifier(),
				idleButtonsModifier: new Modifier(),
				nextPersonModifier: new Modifier()
			};

			// Layouts
			var layouts = {
				flex: new FlexibleLayout({
					ratios: [1.5, 5, 4],
					direction: 1
				}),
				activeButtonsGrid: new GridLayout({
					dimensions: [1, 4]
				}),
				idleButtonsGrid: new GridLayout({
					dimensions: [1, 4]
				})
			};

			// Surfaces and buttons
			var surfaces = {
				nextPersonButton: new Button({
					content: "John Doe",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: BUTTON_SIZE.CONTROLS.LARGE,
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						// Add to queue, take to queue screena
						self.set("currentPerson", informant.get("hostingManager").get("connector").take());
						self.startInteraction();
					}
				}),
				addToQueueButton: new Button({
					content: "Add to Queue",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: BUTTON_SIZE.CONTROLS.LARGE,
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						// Add to queue, take to queue screena
						informant.cancelInteraction();
						informant.createInteraction().start();
						informant.navigateTo("addtoqueue");
						//self.set("preventStopTracking", true);
					}
				}),
				viewQueueButton: new Button({
					content: "View Queue",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: BUTTON_SIZE.CONTROLS.LARGE,
					centerView: true,
					hidden: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function(parent) {
						if (parent.disabled) return;
						// Add to queue, take to queue screena
						informant.navigateTo("queue");
						self.set("preventStopTracking", true);
					}
				}),
				playButton: new Button({
					content: PLAY_ICON,
					centerView: true,
					classes: ["play-stop-font"],
					size: BUTTON_SIZE.PLAY.LARGE,
					sizeList: BUTTON_SIZE.PLAY,
					properties: {
						borderRadius: "400px"
					}
				}, {
					"click": function() {
						if (!self.get("tracking")) self.startInteraction();
					}
				}),
				// Active Grid Buttons
				cancelButton: new Button({
					content: "Oops!",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: [400, 100],
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						if (self.get("currentPerson")) informant.get("hostingManager").get("connector").untake(self.get("currentPerson"));
						self.stopInteraction();
						self.set("currentPerson", null);
					}
				}),
				abortButton: new Button({
					content: "Abort",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: [400, 100],
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						informant.get("currentInteraction").addCategory(informant.get("abortCategory"));
						informant.get("currentInteraction").end();
						self.set("currentPerson", null);
						informant.completeInteraction();
						informant.set("tracking", false);
						self.stopClock();
					}
				}),
				completeButton: new Button({
					content: "Complete",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: [400, 100],
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						self.set("preventStopTracking", true);
						informant.navigateTo("category");
					}
				}),
				// Idle Grid Buttons
				endShiftButton: new Button({
					content: "End Shift",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: [400, 100],
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						if (!informant.get("online")) return;
						if (confirm("Are you sure you want to end your shift?")) informant.endShift();
					}
				}),

				myStatsButton: new Button({
					//content: "<a href='" + (window.location.hostname === 'localhost' ? "https://cs8.salesforce.com/apex/RetailDemandReporting" : "/apex/RetailDemandReporting") + "' class='expandToFill' target='_blank'>My Stats</a>",
					content: "My Stats",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: [400, 100],
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {
						informant.navigateTo("reporting");
					}
				}),
				learnButton: new Button({
					content: "Learn",
					sizeList: BUTTON_SIZE.CONTROLS,
					size: [400, 100],
					centerView: true,
					properties: {
						boxShadow: "1px 1px 3px #888888"
					}
				}, {
					"click": function() {

					}
				})
			};

			// Connect buttons to grid
			layouts.activeButtonsGrid.sequenceFrom([
				surfaces.addToQueueButton.view,
				surfaces.completeButton.view,
				surfaces.abortButton.view,
				surfaces.cancelButton.view
			]);

			layouts.idleButtonsGrid.sequenceFrom([
				surfaces.viewQueueButton.view,
				surfaces.endShiftButton.view,
				surfaces.myStatsButton.view,
				surfaces.learnButton.view
			]);

			// Connect buttons to containers
			views.playerContainer.add(surfaces.playButton.view);

			views.activeButtonsContainer.add(modifiers.activeButtonsModifier).add(layouts.activeButtonsGrid);
			views.idleButtonsContainer.add(modifiers.idleButtonsModifier).add(layouts.idleButtonsGrid);

			views.allButtonsContainer.add(views.activeButtonsContainer);
			views.allButtonsContainer.add(views.idleButtonsContainer);

			views.nextPersonView.add(modifiers.nextPersonModifier).add(surfaces.nextPersonButton.view);

			// Connect containers to layouts
			layouts.flex.sequenceFrom([
				views.nextPersonView,
				views.playerContainer,
				views.allButtonsContainer
			]);

			// Connecting everything
			views.main.add(layouts.flex);

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
			views.main.add(nameSurface);

			this.addNode(views.main);

			this.set("buttonSurfaces", surfaces);
			this.set("modifiers", modifiers);
			this.set("views", views);
			this.set("layouts", layouts);

			this.renderView();
			this.hide();

			this.trackingChanged();

			var hostingQueue = informant.get("hostingManager");

			hostingQueue.on("change:peopleInQueue", function() {
				if (!self.get("tracking")) {
					var nextPerson = self.get("modifiers").nextPersonModifier;
					// Next person modifier
					nextPerson.halt();
					nextPerson.setTransform(Transform.translate(0, 0, 0), {
						duration: informant.get("appWidth")/3,
						curve: "easeInOut"
					});
				}
			});

			var nextPersonSurface = surfaces.nextPersonButton.surface;
			var viewQueueSurface = surfaces.viewQueueButton.surface;
			// set up clock for displaying time person has been waiting in queue
			clockMachine.addCallback(function() {
				if (hostingQueue.get("peopleInQueue") && self.get("nextPerson")) {
					var nextPerson = self.get("nextPerson");
					//var timeWaiting = milliecondsToMinutes(getCorrectedDate(Date.now()) - nextPerson.timeAdded, true);
					var timeWaiting = milliecondsToMinutes(timeSync.get("currentTime") - nextPerson.timeAdded, true);
					nextPersonSurface.setContent(nextPerson.data + " (" + timeWaiting + ")");
					viewQueueSurface.setContent("View Queue ("  + hostingQueue.get("queue").length + ")");
				}
			});

			hostingQueue.on("change:queueReady", function() {

				hostingQueue.on("change:stateChange", function() {
					var nextPersonModifier = self.get("modifiers").nextPersonModifier;

					if (hostingQueue.get("peopleInQueue")) {
						surfaces.viewQueueButton.show();

						var queue = hostingQueue.get("queue");
						var nextPerson = queue[0];

						if (self.get("nextPerson") && self.get("nextPerson").id === nextPerson.id) return;

						self.set("nextPerson", nextPerson);

						// Next person modifier
						nextPersonModifier.halt();
						nextPersonModifier.setTransform(Transform.translate(0, -informant.get("appHeight"), 0), {
							duration: informant.get("appWidth")/3,
							curve: "easeInOut"
						});

						// Change name
						setTimeout(function() {
							surfaces.nextPersonButton.surface.setContent(nextPerson.data);
						}, informant.get("appWidth")/3);

						if (!self.get("tracking")) {
							nextPersonModifier.setTransform(Transform.translate(0, 0, 0), {
								duration: informant.get("appWidth")/3,
								curve: "easeInOut"
							});
						}
					}
					else {
						surfaces.viewQueueButton.hide();
						// Next person modifier
						nextPersonModifier.halt();
						nextPersonModifier.setTransform(Transform.translate(0, -informant.get("appHeight"), 0), {
							duration: informant.get("appWidth")/3,
							curve: "easeInOut"
						});

					}
				});
			});

			informant.on("change:tracking", function() {
				if (informant.get("tracking")) {
					self.trackingChanged();
				}
				else {
					self.trackingChanged();
				}
			});

			clockMachine.addCallback(function() {
				if (self.get("mainClockStarted") && informant.get("currentInteraction")) {
					//self.get("buttonSurfaces").playButton.surface.setContent(milliecondsToMinutes(getCorrectedDate(Date.now()) - informant.get("currentInteraction").get("timeStart")));
					self.get("buttonSurfaces").playButton.surface.setContent(milliecondsToMinutes(getCorrectedDate(Date.now()) - informant.get("currentInteraction").get("timeStart")));
				}
			});

			// Collision Detection
			informant.get("hostingManager").addEventListener("onConflict", function() {
				var currentPerson = self.get("currentPerson");
				if (!confirm("Conflict Detected!  Please sort out which agent is taking this customer.  Click OK to continue this interaction, or Cancel to ignore.")) {
					self.stopInteraction();
					self.set("currentPerson", null);
				}
			})

		},
		startClock: function() {
			// Start the inline clock
			var self = this;
			this.set("mainClockStarted", true);

			/*var timeStart = informant.get("currentInteraction").get("timeStart");
			if (this.get("clock")) this.get("clock").stop();

			this.set("clock", new InlineClock(function() {
				self.get("buttonSurfaces").playButton.surface.setContent(milliecondsToMinutes(Date.now() - timeStart));
			}));
			this.get("clock").start();*/
		},
		stopClock: function() {
			this.set("mainClockStarted", false);
		},
		startInteraction: function() {
			var self = this;
			informant.createInteraction().start();
			this.set("tracking", true);
			this.startClock();
		},
		stopInteraction: function() {
			informant.cancelInteraction();
			this.set("tracking", false);
			this.stopClock();
			//this.get("clock").stop();
		},
		trackingChanged: function() {
			var self = this;
		
			if (informant.get("tracking")) {
				self.startClock();
				this.set("tracking", true);
			}
			else {
				self.stopClock();
				//if (this.get("clock")) this.get("clock").stop();
				this.set("tracking", false);
			}
		
			var active = this.get("modifiers").activeButtonsModifier;
			var nextPerson = this.get("modifiers").nextPersonModifier;
			var idle = this.get("modifiers").idleButtonsModifier;
			var playButton = this.get("buttonSurfaces").playButton.surface;

			var hosting = informant.get("hostingManager");

			this.toggleControlButtons();

			if (this.get("tracking")) {
				playButton.setContent(STOP_ICON);

				// Next person modifier
				nextPerson.halt();
				nextPerson.setTransform(Transform.translate(0, -informant.get("appHeight"), 0), {
					duration: informant.get("appWidth")/3,
					curve: "easeInOut"
				});
			}
			else {

				playButton.setContent(PLAY_ICON);

				// Idle Buttons Modifier
				if (hosting.get("peopleInQueue")) {
					// Next person modifier
					nextPerson.halt();
					nextPerson.setTransform(Transform.translate(0, 0, 0), {
						duration: informant.get("appWidth")/3,
						curve: "easeInOut"
					});
				}
				else {
					// Next person modifier
					nextPerson.halt();
					nextPerson.setTransform(Transform.translate(0, -informant.get("appHeight"), 0), {
						duration: informant.get("appWidth")/3,
						curve: "easeInOut"
					});
				}
			}
		},
		toggleControlButtons: function(immediate) {
			var self = this;
			var active = this.get("modifiers").activeButtonsModifier;
			var idle = this.get("modifiers").idleButtonsModifier;

			if (informant.get("tracking")) {
				// Active Buttons Modifier
				active.halt();
				active.setTransform(Transform.translate(0, 0, 0), {
					duration: (immediate ? 0 :informant.get("appWidth") / 3),
					curve: "easeInOut"
				});

				// Idle Buttons Modifier
				idle.halt();
				idle.setTransform(Transform.translate(-informant.get("appWidth"), 0, 0), {
					duration: (immediate ? 0 :informant.get("appWidth") / 3),
					curve: "easeInOut"
				});
			}
			else {
				// Active Buttons Modifier
				active.halt();
				active.setTransform(Transform.translate(-informant.get("appWidth"), 0, 0), {
					duration: (immediate ? 0 :informant.get("appWidth") / 3),
					curve: "easeInOut"
				});

				idle.halt();
				idle.setTransform(Transform.translate(0, 0, 0), {
					duration: (immediate ? 0 :informant.get("appWidth") / 3),
					curve: "easeInOut"
				});
			}
		},
		onResize: function() {
			this.toggleControlButtons(true);
		}

	});

	return TrackingView;
});
