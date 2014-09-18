define("core/view-model", function(require) {
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var Transform = require("famous/core/Transform");
	var TransitionableTransform = require("famous/transitions/TransitionableTransform");

	var informant = require("core/informant");

	var ViewModel = Backbone.Model.extend({
		defaults: {
			routes: null,
			active: false,
			view: null,
			modifier: null,
			nodes: null,
			ready: false
		},
		initialize: function() {

			var containerView = new View();
			var containerModifier = new Modifier({
				transform: Transform.translate(-500, 0, 0)
			});

			containerView.add(containerModifier);

			this.set("view", containerView);
			this.set("modifier", containerModifier);

			// Events
			this.on("change:active", this.toggleVisible);

			// Set default ui setting to hidden
			this.hide();
		},
		callSuper: function() {
			ViewModel.prototype.initialize.apply(this);
		},
		addNode: function(node) {
			if (typeof this.get("nodes") === "undefined") this.set("nodes", [node]);
			else {
				this.set("nodes", this.get("nodes").push(node));
			}
		},
		renderView: function() {
			var chain = this.get("view").add(this.get("modifier"));
			_(this.get("nodes")).each(function(item) {
				chain = chain.add(item);
			});
			this.set("ready", true);
		},
		show: function(immediate) {
			if (this.get("name") !== "home" && this.get("name") !== "loggingout") $("body").addClass("grey");
			else $("body").removeClass("grey");
			// set transform is deprecated but we're gonna use it as long as possible
			this.get("modifier").halt();
			this.get("modifier").setTransform(Transform.translate(0, 0, 0), {
				duration: (immediate ? 0 : informant.get("appWidth") / 3),
				curve: "easeInOut"
			}, function() {
				informant.resizeViews();
			});
			if (this.onShow) this.onShow();
			//this.get("modifier").opacityFrom(1);
		},
		// Immediate flag determines whether to have a duration or just set it straight away
		hide: function(immediate) {
			// set transform is deprecated but we're gonna use it as long as possible
			this.get("modifier").halt();
			this.get("modifier").setTransform(Transform.translate(-(informant.get("appWidth") + 30), 0, 0), {
				duration: (immediate ? 0 :informant.get("appWidth") / 3),
				curve: "easeInOut"
			});
			if (this.onHide) this.onHide();
			//this.get("modifier").opacityFrom(0);
		},
		toggleVisible: function() {
			//this.resize(informant.get("currentSize"));
			if (this.get("active")) this.show();
			else this.hide();
		},
		treeBuilder: function(tree) {
			var newTree = {
				node: new View(),
				children: {
					modifier: {
						node: new Modifier()
					},
					grid: {
						node: new View()
					}
				}
			};

			var parseNode = function(nodeBlock) {
				var node = nodeBlock.node;
				if (typeof nodeBlock.children === "undefined") return nodeBlock.node;

				var children = nodeBlock.children;
				var method = (typeof nodeBlock.sequence === "undefined" ? "add" : "sequenceFrom");
				var chain = node;

				if (method === "add") {
					_(children).forOwn(function(item, key) {
						chain = chain.add(parseNode(item));
					});
				}
				else {
					var sequenceItems = [];
					_(children).forOwn(function(item, key) {
						sequenceItems.push(parseNode(item));
					});
					node.sequenceFrom(sequenceItems);
				}

				return node;
			};

			return parseNode(tree);
		},
		startEvents: function() {
			var self = this;
			_(this.events).forOwn(function(item, key) {
				self.on(key, item.call(self))
			})
		},
		resize: function(size) {
			var self = this;
			if (this.get("active")) this.show(true);
			else this.hide(true);
			if (this.get("buttonSurfaces")) {
				_(this.get("buttonSurfaces")).forOwn(function(btn) {
					if (btn.resize) btn.resize(size);
				});
			}
			if (this.onResize) this.onResize(size);
		}
	});

	return ViewModel;
});