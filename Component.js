sap.ui.define([ "sap/ui/core/UIComponent", "sap/ui/Device", "sap/ui/model/json/JSONModel"

                ], function(UIComponent, Device, JSONModel) {
    "use strict";

    return UIComponent.extend("sap.ui.pp.mobi.Component", {

	metadata : {
	    manifest : "json"
	},

	init : function() {

	    // call the init function of the parent
	    UIComponent.prototype.init.apply(this, arguments);

 	    
	    oModel = new JSONModel();
	    this.setModel(oModel, "messages");	    
	    
	    oModel = new JSONModel();
	    this.setModel(oModel, "controls");		    
	    
	    //		var deviceModel = new sap.ui.model.json.JSONModel({
	    oModel = new JSONModel({
		user : "",
		pass : ""
	    });
	    //oModel.setDefaultBindingMode("OneWay");
	    this.setModel(oModel, "currentUser");

	    oModel = new JSONModel({
		btnLogout : false, //ascundere buton Logout daca nu e nimeni logat
		btnAuthen : true,
		clientSAP : '100',
		serverSAP : 'http://sapserv03.saprsy.local:8086'
	    });
	    //oModel.setDefaultBindingMode("OneWay");
	    this.setModel(oModel, "config");

	    
	    var oConfig = this.getMetadata().getConfig();
	    var sNamespace = this.getMetadata().getManifestEntry("sap.app").id;

	    
 
	    var oModel = new JSONModel('./Materials.json');
	    this.setModel(oModel, "MaterialsCollection");			

	    var oModel = new JSONModel('./Chargs.json');
	    this.setModel(oModel, "ChargsCollection");
	    
	    
	    // create the views based on the url/hash
	    this.getRouter().initialize();

	}
    });

});