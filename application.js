define(function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var HeaderFooterLayout = require("famous/views/HeaderFooterLayout");
	var GridLayout = require("famous/views/GridLayout");
	var View = require("famous/core/View");

	var Modifier = require("famous/core/Modifier");
	var ViewSequence = require("famous/views/SequentialLayout");
	var FlexibleLayout = require("famous/views/FlexibleLayout");

	var Transform = require('famous/core/Transform');
	var SpringTransition = require('famous/transitions/SpringTransition');
	var Transitionable   = require('famous/transitions/Transitionable');
	var TransitionableTransform = require('famous/transitions/TransitionableTransform');
	var Easing = require('famous/transitions/Easing');
	var Transitionable   = require('famous/transitions/Transitionable');

	Transitionable.registerMethod('spring', SpringTransition);

	var app = function() {
		// constructor
		var mainContext = Engine.createContext();

		// PREPARE THE BOUNCE WEAPON
		var transition = new TransitionableTransform(Transform.scale(1, 1, 1));

		var buttonSurface = new Surface({
			classes: ["red-button"],
			content: "<i>Wow!</i><h1>Hello!</h1>",
			size: [400, 150]
		});
		var surfaceModifier = new Modifier({
			// [x, y]
			align: [0.5, 0.5],
			origin: [0.5, 0.5],
			// [w, h]
			size: [400, 150],
			transform: transition
		});

		mainContext.add(surfaceModifier).add(buttonSurface);

		function bounce() {
			var bounceAmount = 0.8
			var transitionObject = Transform.scale(bounceAmount, bounceAmount, bounceAmount);
			// Halt any existing transitions to make sure we don't mess up
			transition.halt();
			// Gogogogogogo
			transition.set(transitionObject, {duration: 80}, function() {
				transition.set(Transform.identity, { method: 'spring', period: 800, dampingRatio: 0.1 });
			});
		}

		buttonSurface.on("click", function() {
			bounce();
		});

		return {
			bounce: bounce
		}
	}

	// Global reference for main application
	window.app = new app();
});