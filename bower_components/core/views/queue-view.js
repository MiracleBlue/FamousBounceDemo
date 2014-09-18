define("core/views/queue-view", function(require) {
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

	var clockMachine = require("core/models/clockMachine");
	var timeSync = require("core/models/timeSync");

	var QueueView = ViewModel.extend({
		defaults: {
			name: "queue",
			active: false,
			queuedListElement: null,
			listenerReady: false
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
				["queue", "queue", function() {
					nameSurface.setContent(informant.get("userName") + " - <a style='color:black;cursor:pointer' onclick=\"informant.navigateTo('login')\">" 
							+ informant.get("currentStore")[[Object.keys(informant.get("currentStore"))[0]]] + "</a>");
					self.set("active", true);
					informant.set("backButtonRoute", "tracking");
					informant.set("backButtonCallback", function() {});

					self.refreshQueue(informant.get("hostingManager").get("connector").queue);

					if (!self.get("listenerReady")) {
						var queuedListElement = $("#queuedlist");
						if (!self.get("queuedListElement")) self.set("queuedListElement", queuedListElement);

						self.set("listenerReady", true);

						informant.get("hostingManager").addEventListener("onStateChange", function(data) {
							var diff = verboseDifference(data.oldQueue, data.newQueue, "id");

							_(diff.added).each(function(item) {
								self.addToQueue(item);
							});
							_(diff.removed).each(function(item) {
								self.removeFromQueue(item);
							});

							if (!data.newQueue.length) {
								$("#emptymessage").show();
							}
							else {
								$("#emptymessage").hide();
							}
						});
					}
				}]
			]);

			// Set global function for removing something from the queue
			window.powerup_remove_from_queue = function(id) {
				if (confirm("Are you sure you want to remove this customer from the queue?")) {
					self.removeFromQueue(id);
				}
			};

			var mainView = new View();
			var alignModifier = new Modifier();

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
				classes: ["back-btn"],
				properties: {
					borderRadius: "none",
					lineHeight: "100px",
					borderTop: "10px solid white"
				}
			}, {
				"click": function() {
					informant.navigateTo("tracking");
				}
			});

			backButtonContainer.add(backButtonModifier).add(backButton.view);

			// All people
			var peopleContainer = new View();
			var peopleSurface = new Surface({
				size: [undefined, undefined],
				content: "<div id='queuedlist'></div><div id='emptymessage'><h2>No one in queue</h2></div>"
			});

			peopleContainer.add(peopleSurface);

			mainView.add(peopleContainer);
			// Groups always get added last to the DOM, so this means that
			// the scrollview will always be above surfaces.
			// To hack around this, I've wrapped my button surface in a group
			// so that it should get added in the right order, without setTimeout
			var groupHack = new Group();
			groupHack.add(backButtonContainer);
			groupHack.add(nameSurface);
			mainView.add(groupHack);
			//mainView.add(backButtonContainer);

			
			//mainView.add(nameSurface);

			this.addNode(mainView);

			this.renderView();
			this.hide();

			// Start clock for time people spend in queue
			clockMachine.addCallback(function() {

				var queuedList = $("#queuedlist .person .name");
				//console.log("queueView addCallback", queuedList);
				if (queuedList.length) {
					queuedList.each(function() {
						var elem = $(this);
						//var timeSpent = milliecondsToMinutes(getCorrectedDate(Date.now()) - elem.data("timeadded"), true);
						var timeSpent = milliecondsToMinutes(timeSync.get("currentTime") - elem.data("timeadded"), true);
						elem.html(elem.data("name") + " (" + timeSpent + ")");
					})
				}
			})
		},
		addToQueue: function(person) {
			var queuedListElement = this.get("queuedListElement") || $("#queued-list");
			queuedListElement.append("<div class='person' data-id='"+person.id+"'><span class='name' data-name='"+person.data+"' data-timeadded='" + person.timeAdded + "'>"+person.data+"</span><button class='removeButton' onclick='powerup_remove_from_queue(\""+person.id+"\")'/></div>");
		},
		removeFromQueue: function(item) {
			if (typeof item === "string") item = informant.get("hostingManager").get("connector").getById(item);
			var queuedListElement = this.get("queuedListElement") || $("#queuedlist");

			queuedListElement.find("[data-id='"+item.id+"']").remove();
			informant.get("hostingManager").get("connector").remove(item);
		},
		refreshQueue: function(queue) {
			if (!queue.length) {
				$("#emptymessage").show();
			}
			else {
				$("#emptymessage").hide();
			}

			var queuedListElement = this.get("queuedListElement") || $("#queuedlist");

			var htmlString = "";
			_(queue).each(function(item) {
				htmlString += "<div class='person' data-id='"+item.id+"'><span class='name' data-name='"+item.data+"' data-timeadded='" + item.timeAdded + "'>"+item.data+"</span><button class='removeButton' onclick='powerup_remove_from_queue(\""+item.id+"\")'/></div>";
			});
			queuedListElement.html(htmlString);
		},


	});

	return QueueView;
});
