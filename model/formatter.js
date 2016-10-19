sap.ui.define(function() {
	"use strict";

	var Formatter = {

		status: function(sStatus) {
			if (sStatus === "Available") {
				return "Success";
			} else if (sStatus === "Out of Stock") {
				return "Warning";
			} else if (sStatus === "Discontinued") {
				return "Error";
			} else {
				return "None";
			}
		},

		favorite: function(sStatus) {
			return sStatus.length % 2 === 0;
		},

		formatMessageType: function(type) {
			if (type == 'E') {
				return 'Error';
			} else if (type == 'W') {
				return 'Warning';
			} else if (type == 'I') {
				return 'Information';
			} else if (type == 'S') {
				return 'Success';
			} else {
				return 'None';
			}
		},

		formatMessageTitle: function(type) {
			if (type == 'E') {
				return 'Error';
			} else if (type == 'W') {
				return 'Warning';
			} else if (type == 'I') {
				return 'Information';
			} else if (type == 'S') {
				return 'Success';
			} else {
				return 'None';
			}
		}

	};

	return Formatter;

}, /* bExport= */ true);