define("core/button", function(require) {
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var Surface = require('famous/core/Surface');
	var Transform = require('famous/core/Transform');
	var SpringTransition = require('famous/transitions/SpringTransition');
	var Transitionable   = require('famous/transitions/Transitionable');
	var TransitionableTransform = require('famous/transitions/TransitionableTransform');
	var StateModifier = require("famous/modifiers/StateModifier");
	var Easing = require('famous/transitions/Easing');
	Transitionable.registerMethod('spring', SpringTransition);

	var informant = require("core/informant");

	var Button = function(options, events) {
		var self = this;

		var defaults = {
			// Custom props
			centerView: false,
			bounceAmount: 0.8,
			toggleClass: "toggle-on",
			toggleGroup: "default-group", // This is the ID that corresponds to the object stored in the ToggleGroup object
			convertClickToTouch: true, // When false, this will not convert "clicks" to "touchend"
			enableBounce: true,
			// Surface props
			content: "Button",
			// [width, height]
			size: [undefined, undefined],
			sizeList: null,
			centerText: true,
			classes: ['red-bg', 'button-view'],
			hidden: false,
			properties: {
				textAlign: 'center',
				borderRadius: "3px"
			}
		};
		// Merge the classes array items
		if (typeof options.classes !== "undefined") {
			for (var i = 0; i < defaults.classes.length; i++) {
				options.classes.push(defaults.classes[i]);
			}
		}

		options = _.merge(defaults, options);

		var transition = new TransitionableTransform(Transform.scale(1, 1, 1));

		// View management
		var mainView = new View();
		var alignModifier = new Modifier({
			origin: (options.centerView ? [0.5, 0.5] : [0, 0]),
			align: (options.centerView ? [0.5, 0.5] : [0, 0]),
			size: options.size
		});
		var bounceModifier = new Modifier({
			transform: transition,
			origin: [0.5, 0.5],
			align: [0.5, 0.5]
		});

		var opacityModifier = new StateModifier({
			opacity: (options.hidden ? 0 : 1)
		});

		var buttonSurface = new Surface(options);

		if (informant.get("isTouchDevice")) {
			// Bounce!
			buttonSurface.on("touchstart", function() {
				if (options.enableBounce) self.bounceDown();
			});
			buttonSurface.on("touchend", function() {
				if (options.convertClickToTouch && typeof events["click"] !== "undefined") events["click"].call(buttonSurface, self);
				if (options.enableBounce) self.bounceUp();
			});
			// Event management
			_(events).forOwn(function(val, key) {
				if (options.convertClickToTouch && key === "click") return;
				buttonSurface.on(key, function() {
					val.call(buttonSurface, self);
				});
			});
		}
		else {
			// Event management
			_(events).forOwn(function(val, key) {
				buttonSurface.on(key, function() {
					val.call(buttonSurface, self);
				});
			});
		}

		buttonSurface.on("deploy", function() {
			self.resize(informant.get("currentSize"));
		});

		// Connect everything
		mainView.add(alignModifier).add(bounceModifier).add(opacityModifier).add(buttonSurface);

		if (options.normalProperties) buttonSurface.setProperties(options.normalProperties);

		this.toggled = false;

		this.options = options;
		this.view = mainView;
		this.modifier = alignModifier;
		this.surface = buttonSurface;
		this.disabled = (options.hidden ? true : false);
		this.bounceDown = function() {
			var transObject = Transform.scale(options.bounceAmount, options.bounceAmount, options.bounceAmount);
			transition.halt();
			// var transObject = Transform.identity;
			transition.set(transObject, {duration: 80});
		};
		this.bounceUp = function() {
			transition.halt();
			transition.set(Transform.identity, { method: 'spring', period: 300, dampingRatio: 0.3 }, function() {

			});
		};
		this.pipe = function() {
			this.surface.pipe.apply(this.surface, arguments);
		};
		this.toggle = function() {
			if (!this.toggled) {
				this.surface.addClass(options.toggleClass);
				if (options.toggleProperties) this.surface.setProperties(options.toggleProperties);
				this.toggled = true;
			}
			else {
				this.surface.removeClass(options.toggleClass);
				if (options.properties) this.surface.setProperties(options.properties);
				this.toggled = false;
			}
		};
		this.resize = function(size) {
			if (typeof size === "string" && options.sizeList) {
				alignModifier.setSize(options.sizeList[size]);
				buttonSurface.setSize(options.sizeList[size]);
			}
			if (options.centerText) {
				var actualSize = buttonSurface.getSize(true);
				if (!actualSize) actualSize = buttonSurface.getSize();
				buttonSurface.setProperties({
					"paddingTop": ((actualSize[1] / 2) - (30 / 2)) + "px"
				});
			}
		};
		this.setDisabled = function(disabled) {
			this.disabled = disabled;
			if (disabled) buttonSurface.addClass("disabled");
			else buttonSurface.removeClass("disabled");
		};
		this.hide = function() {
			opacityModifier.setOpacity(0, {
				duration: 200
			});
			this.setDisabled(true);
		};
		this.show = function() {
			opacityModifier.setOpacity(1, {
				duration: 200
			});
			this.setDisabled(false);
		}
	};

	return Button;
});