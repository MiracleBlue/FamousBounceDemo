define("core/views/reporting-view", function(require) {
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

	var ReportingView = ViewModel.extend({
		defaults: {
			name: "reporting",
			active: false
		},
		initialize: function() {
			this.callSuper();

			var self = this;

			var mainView = new View();
			var alignModifier = new Modifier();

			var iframeWindow;

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
					//iframeWindow.contentWindow.postMessage("goback", window.location.protocol + "//" + window.location.host);
					informant.navigateTo(informant.get("previousRoute"));
				}
			});

			backButtonContainer.add(backButtonModifier).add(backButton.view);


			// All people
			var reportingContainer = new View();
			var reportingSurface = new Surface({
				size: [undefined, undefined],
				//content: "<iframe id='reportingframe' src='" + (window.location.hostname === 'localhost' ? "https://cs8.salesforce.com/apex/RetailDemandReporting" : "/apex/RetailDemandReporting") + "'></iframe>"
				content: "<iframe id='reportingframe' src='about:blank'></iframe>"
			});


			reportingContainer.add(reportingSurface);

			mainView.add(reportingContainer);
			// Groups always get added last to the DOM, so this means that
			// the scrollview will always be above surfaces.
			// To hack around this, I've wrapped my button surface in a group
			// so that it should get added in the right order, without setTimeout
			
			var groupHack = new Group();
			groupHack.add(backButtonContainer);
			mainView.add(groupHack);
			//mainView.add(backButtonContainer);

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

			mainView.add(nameSurface);

			this.addNode(mainView);

			this.renderView();
			this.hide();

			var eventAdded = false;
			this.set("routes", [
				["reporting", "reporting", function() {
					self.set("active", true);


					iframeWindow = document.querySelector("#reportingframe");


					var storeString = (informant.get("currentStore") != null ? "?storeCode=" + informant.get("currentStore")[[Object.keys(informant.get("currentStore"))[0]]] : "");
					

					var src = (window.location.hostname === 'localhost' ? "https://cs8.salesforce.com/apex/PowerUpRetailDemandPieTest" + storeString : "/apex/PowerUpRetailDemandPieTest" + storeString);
					
					//iframeWindow.contentWindow.postMessage("storeCode:" + informant.get("currentStore"), window.location.protocol + "//" + window.location.host);
					
					//alert("" + window.location.protocol + "//" + window.location.host);
					
					if(informant.get("currentStore") != null){

						nameSurface.setContent(informant.get("userName") + " - <a style='color:black;cursor:pointer' onclick=\"informant.navigateTo('login')\">" 
								+ informant.get("currentStore")[[Object.keys(informant.get("currentStore"))[0]]] + "</a>");

					
					}
					document.querySelector("#reportingframe").src = src + "?" + Math.random();

					if (!eventAdded) {
						window.addEventListener("message", function(e) {
							informant.navigateTo(informant.get("previousRoute"));
						}, false);
						eventAdded = true;
					}

					informant.set("backButtonRoute", informant.get("previousRoute"));
					informant.set("backButtonCallback", function() {});
				}]
			]);
		}

	});

	return ReportingView;
});
