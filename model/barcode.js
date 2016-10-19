sap.ui.define(function() {
	"use strict";

	var BarCodeScanner = {

		connect: function(callback) {
			var code = "";
			var timeStamp = 0;
			var timeout = null;

			this.handler = function(e) {
				if (timeStamp + 50 < new Date().getTime()) {
					code = "";
				}

				timeStamp = new Date().getTime();
				clearTimeout(timeout);

				if (e.which != 13) { // ignore returns
					code += String.fromCharCode(e.which);
				}
				timeout = setTimeout(function() {
					if (code.length >= 3) {

						callback(code);
					}
					code = "";
				}, 100);
			};

			$('body').on('keypress', this.handler);

		},
		disconnect: function() {
			$('body').off('keypress', this.handler);
		}
	};

	return BarCodeScanner;

}, /* bExport= */ true);