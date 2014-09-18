define("core/components/list", function(require) {
	var Engine = require('famous/core/Engine');
	var Surface = require('famous/core/Surface');
	var View = require("famous/core/View");
	var Modifier = require("famous/core/Modifier");
	var ScrollView = require("famous/views/Scrollview");

	var Button = require("../button");

	var List = Backbone.Model.extend({
		defaults: {
			list: null,
			view: null,
			modifier: null,
			scroller: null
		},
		initialize: function() {

			var self = this;

			var mainView = new View();

			var modifier = new Modifier({
				size: [undefined, undefined]
			});

			var scroller = new ScrollView({
				speedLimit: 2.5,
				edgeGrip: 0.05,
				clipSize: window.innerHeight - 300
			});
			var surfaceList = [];

			scroller.sequenceFrom(surfaceList);

			_(this.get("list")).each(function(item) {
				item.pipe(scroller);
				surfaceList.push((item.view ? item.view : item));
			});

			mainView.add(modifier).add(scroller);

			this.set("view", mainView);
			this.set("scroller", scroller);
			this.set("modifier", modifier);
		}

	});

	return List;
});