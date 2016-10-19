sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/pp/mobi/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/pp/mobi/model/barcode"
], function(Controller, JSONModel, formatter, Filter, FilterOperator, MessageToast, MessageBox, BarCodeScanner) {

	"use strict";

	return Controller.extend("sap.ui.pp.mobi.controller.OrderList", {

		formatter: formatter,

		onInit: function() {
			var oOrderModel = this.getOwnerComponent().getModel("orderlist");
			this.getView().setModel(oOrderModel);

			//var oModel = this.getOwnerComponent().getModel("currentUser");
			//this.getView().setModel(oModel,'currentUser');
			//var oModelConfig = this.getView().getModel("config")

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

			oRouter.getRoute("orderlist").attachPatternMatched(this._onObjectMatched, this);

		},

		_onObjectMatched: function(oEvent) {
		 
			var self = this;
			BarCodeScanner.connect(function(barcode) {
				self.on_scan(barcode);
			});
		},

		on_scan: function(barcode) {
			MessageToast.show("Linia de productie: " + barcode);
			// build filter array
			var aFilter = [];
			aFilter.push(new Filter("HEADER/PRODUCTION_LINE", FilterOperator.Contains, barcode));
			// filter binding
			var oList = this.getView().byId("orderList");
			var oBinding = oList.getBinding("items");
			oBinding.filter(aFilter);
		},

		onFilterOrders: function(oEvent) {

			// build filter array
			var aFilter = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery) {
				aFilter.push(new Filter("HEADER/PRODUCTION_LINE", FilterOperator.Contains, sQuery));
			}

			// filter binding
			var oList = this.getView().byId("orderList");
			var oBinding = oList.getBinding("items");
			oBinding.filter(aFilter);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPressOrder: function(oEvent) {
			// The source is the list item that got pressed
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var oItem = oEvent.getSource();
			var oContext = oItem.getBindingContext();
			var orderPath = oContext.getPath();

			var oViewOrderDetail = this.getView('orderdetail');
			oViewOrderDetail.setBindingContext(oContext);

			var PathID = orderPath.replace('/ROOT/OBJ_COLLECTION/', '');

			oRouter.navTo("orderdetail", {
				id: PathID
			});
		},

		handleRefreshSO: function(oEvent) {
			var oView = this.getView();
			oView.setBusy(true);

			var oConfig = this.getView().getModel("config").getData();

			var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;

			var currentUser = this.getView().getModel("currentUser").getData();

			//var url = oConfig.orderServer + "&resursa="+currentUser.user+"&pass="+currentUser.pass+"&detail=all";
			var url = oConfig.serverSAP + '/sap/bc/zppmobi?sap-client=' + oConfig.clientSAP + "&detail=all";
			var oOrderModel = new JSONModel();

			oOrderModel.attachRequestCompleted(function(oEvent) {
				oView.setBusy(false);
				var success = oEvent.getParameter("success");
				if (success) {
					var oData = oOrderModel.getData();
					console.log(oOrderModel);
					MessageToast.show("Date incarcate din SAP cu succes");
					oData.User = currentUser.user;
					oOrderModel.refresh();
					localStorage.setItem(sNamespace + '.orders', oOrderModel.getJSON());

				} else {
					MessageBox.error("Nu se poate accesa serverul de SAP");
				}

			});

			var parameters = {
				"sap-client": oConfig.clientSAP,
				"sap-user": currentUser.user,
				"sap-password": currentUser.pass
			};
			var headers = {};

			oOrderModel.loadData(url, parameters, true, "GET", false, false, headers);
			this.getOwnerComponent().setModel(oOrderModel, "orderlist");
			this.getView().setModel(oOrderModel);
		},

		handleLocalData: function(oEvent) {
			var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;
			var orders_json = localStorage.getItem(sNamespace + '.orders');

			var oModelcurrentUser = this.getView().getModel("currentUser");

			if (orders_json) {
				var oOrderModel = new JSONModel(JSON.parse(orders_json));
				//oOrderModel.attachRequestCompleted(function(oEvent) {
				oModelcurrentUser.getData().user = oOrderModel.getData().User;
				oModelcurrentUser.refresh();
				//});
			} else {
				var oConfig = this.getOwnerComponent().getMetadata().getConfig();
				var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;
				var oOrderModel = new JSONModel(jQuery.sap.getModulePath(sNamespace, '/Orders.json'));
				MessageToast.show("Date de TEST incarcate cu succes");
			}

			this.getOwnerComponent().setModel(oOrderModel, "orderlist");
			this.getView().setModel(oOrderModel);
		},

		handleLocalDataTest: function(oEvent) {
			var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;

			var oModelcurrentUser = this.getView().getModel("currentUser");

			var oConfig = this.getOwnerComponent().getMetadata().getConfig();
			var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;
			var oOrderModel = new JSONModel(jQuery.sap.getModulePath(sNamespace, '/Orders.json'));
			MessageToast.show("Date de TEST incarcate cu succes");

			this.getOwnerComponent().setModel(oOrderModel, "orderlist");
			this.getView().setModel(oOrderModel);
		},

		handleLogout: function(oEvent) {
			var oView = this.getView();
			var oOwnerComponent = this.getOwnerComponent();
			MessageBox.confirm("Sunteti sigur?", fnCallbackConfirm);

			function fnCallbackConfirm(bResult) {
				var oOrderModel = new JSONModel({});

				oOwnerComponent.setModel(oOrderModel, "orderlist");
				oView.setModel(oOrderModel);

				oView.getModel("currentUser").getData().user = '';
				oView.getModel("currentUser").getData().pass = '';
				oView.getModel("currentUser").refresh();
				// trebuie trimis un request la adresa /sap/public/bc/icf/logoff
			}
		},

		handlePressConfiguration: function(oEvent) {
			var bundle = this.getView().getModel("i18n").getResourceBundle();

			if (!this.oBusyDialog) {
				this.oBusyDialog = new sap.m.BusyDialog();
			}

			var oModelConfig = this.getView().getModel("config");

			this.oBusyDialog.open();
			var that = this;

			var oConfigDialog = new sap.m.Dialog({
				title: bundle.getText("BtnConfig"),
				type: sap.m.DialogType.Message,
				content: [new sap.m.Label({
						text: "Server "
					}), new sap.m.Input({
						value: '{/serverSAP}'
					}),
					new sap.m.Label({
						text: "Client "
					}), new sap.m.Input({
						value: '{/clientSAP}',
						maxLength: 3
					})
				],
				leftButton: new sap.m.Button({
					text: "OK",
					press: function() {
						oConfigDialog.close();
					}
				}),
				rightButton: new sap.m.Button({
					text: "Cancel",
					press: function() {
						oConfigDialog.close();
					}
				}),
				afterClose: function(evt) {
					var pressedButton = evt.getParameter("origin");
					if (pressedButton === this.getBeginButton()) {

						oModelConfig.getData().serverSAP = oConfigDialog.getModel().getData().serverSAP;
						oModelConfig.getData().clientSAP = oConfigDialog.getModel().getData().clientSAP;
						oModelConfig.refresh();

					}

					oConfigDialog.destroy();
				}
			});
			that.oBusyDialog.close();

			var oModel = new JSONModel(JSON.parse(oModelConfig.getJSON()));

			oConfigDialog.setModel(oModel);
			//  deschid dialog        
			oConfigDialog.open();
		},

		handlePressStart: function(oEvent) {
			var oButton = oEvent.getSource();

			// afisare buton LOGOUT daca am user logat
			var oModelConfig = this.getView().getModel("config");

			if (this.getView().getModel("currentUser").getData().user) {
				oModelConfig.oData.btnLogout = true;
			} else {
				oModelConfig.oData.btnLogout = false;
			}

			this.oActionSheet = sap.ui.xmlfragment("sap.ui.pp.mobi.view.ActionSheet", this);
			this.getView().addDependent(this.oActionSheet);

			this.oActionSheet.openBy(oButton);
		},

		handleAuthentification: function(oEvent) {

			var bundle = this.getView().getModel("i18n").getResourceBundle();

			if (!this.oBusyDialog) {
				this.oBusyDialog = new sap.m.BusyDialog();
			}

			var oModelcurrentUser = this.getView().getModel("currentUser");

			this.oBusyDialog.open();
			var that = this;

			var oLogonDialog = new sap.m.Dialog({
				title: bundle.getText("BtnAuthen"),
				type: sap.m.DialogType.Message,
				content: [new sap.m.Label({
						text: "Username"
					}), new sap.m.Input({
						value: '{/user}'
					}),
					new sap.m.Label({
						text: "Password"
					}), new sap.m.Input({
						type: sap.m.InputType.Password,
						value: '{/pass}'
					})
				],
				leftButton: new sap.m.Button({
					text: "OK",
					press: function() {
						oLogonDialog.close();
					}
				}),
				rightButton: new sap.m.Button({
					text: "Cancel",
					press: function() {
						oLogonDialog.close();
					}
				}),
				afterClose: function(evt) {
					var pressedButton = evt.getParameter("origin");
					if (pressedButton === this.getBeginButton()) {
						if ((oLogonDialog.getModel().getData().user) && (oLogonDialog.getModel().getData().pass)) {
							oModelcurrentUser.getData().user = oLogonDialog.getModel().getData().user;
							oModelcurrentUser.getData().pass = oLogonDialog.getModel().getData().pass;
							oModelcurrentUser.refresh();
							that.handleRefreshSO(evt);

						} else {
							sap.m.MessageBox.alert("Introduceti utilizator / parola !", {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "Atentie!",
								onClose: null,
								styleClass: ""
							});
						}
					}

					oLogonDialog.destroy();
				}
			});
			that.oBusyDialog.close();
			// setez ultimul user care a folosit aplicatia
			var model = new sap.ui.model.json.JSONModel();
			model.setData({
				user: oModelcurrentUser.getData().user,
				pass: oModelcurrentUser.getData().pass
			});
			oLogonDialog.setModel(model);
			// deschid dialog
			oLogonDialog.open();
		}

	});

});