var that;

/* global location */
sap.ui.define(["sap/ui/core/mvc/Controller",
		"sap/ui/model/json/JSONModel",
		'sap/m/Button',
		'sap/m/Dialog',
		'sap/m/Text',
		"sap/ui/core/routing/History",
		"sap/ui/pp/mobi/model/formatter",
		"sap/ui/model/Filter",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"sap/ui/pp/mobi/model/barcode"
	],

	function(Controller, JSONModel, Button, Dialog, Text, History, formatter, Filter, MessageToast, MessageBox, BarCodeScanner) {

		"use strict";

		return Controller.extend("sap.ui.pp.mobi.controller.OrderDetail", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * 
			 * @public
			 */
			onInit: function() {
				// Model used to manipulate control states. The
				// chosen values make sure,
				// detail page is busy indication immediately so
				// there is no break in
				// between the busy indication for loading the
				// view's meta data
				var iOriginalBusyDelay, oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

				var oOrderModel = this.getOwnerComponent().getModel("orderlist");
				this.getView().setModel(oOrderModel);

				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

				oRouter.getRoute("orderdetail").attachPatternMatched(this._onObjectMatched, this);

			},

			on_scan: function(barcode) {
				MessageToast.show("Lot scanat: " + barcode);
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oChargs= this.getView().getModel("ChargsCollection").getData();
				var i;
				var gasit = false;
				for (i in oChargs.ROOT.OBJ_COLLECTION) {
					var lot = oChargs.ROOT.OBJ_COLLECTION[i];
					if (lot.CHARG == barcode){
						gasit = true;
						break; 
					}
				}
				if (gasit == false) {
					MessageToast.show("Lot " + barcode + " scanat nu exista");	
					return;
				}
				
				gasit = false;
				for (i in oData.Order.COMPONENTS) {
					var comp = oData.Order.COMPONENTS[i];
					if (lot.CHARG == comp.CHARG){
						gasit = true;
						break; 	
					}
				}
				
				if (gasit == true) {
					MessageToast.show("Lotul  "+lot.CHARG+' a fost utilizat');	
					return;
				}
				
				gasit = false;
				for (i in oData.Order.COMPONENTS) {
					var comp = oData.Order.COMPONENTS[i];
					if (comp.MATERIAL == lot.MATERIAL && comp.CHARG == '' ){
						gasit = true;
						break; 	
					}
				}
				if (gasit == false) {
					MessageToast.show("Materialul "+lot.MATL_DESC+' nu se gaseste in lista de componente');	
					return;
				}
				
				comp.CHARG = lot.CHARG;
				if (comp.CONF_QUAN > lot.QTY  ){
					comp.CONF_QUAN = lot.QTY;
					comp.split = true;
					this.doSplitItem(comp);
				}
				
				oView.getModel().setData(oData);
				var oComponentsList = oView.byId("componentsList");
				oComponentsList.getModel().refresh(); // asta nu are efect
				
			},

			onPressTest: function(oEvent){
				this.on_scan('0003');
			},

			_onObjectMatched: function(oEvent) {
				var self = this;
				BarCodeScanner.connect(function(barcode) {
					self.on_scan(barcode);
				});

				var id = oEvent.getParameter("arguments").id;

				//var oData = this.getView().getModel("orderlist").getData().ROOT.OBJ_COLLECTION[id];
				//oView.getModel().setData(oData);

				/*

				this.getView().bindElement({
				path : "/ROOT/OBJ_COLLECTION/" + id,
				model : "orderlist"
				});
				 */

				var oView = this.getView();
				var oData = oView.getModel().getData();

				if (typeof (oData.ROOT) == "undefined") {
					this.onNavBack();
				}

				// un shortcut la comanda
				oData.Order = oData.ROOT.OBJ_COLLECTION[id];

				if (typeof (oData.Order.StateInit) == "undefined") {
					oData.Order.StateInit = true;
					oData.Order.StateStart = false;
					oData.Order.StateWork = false;
					oData.Order.StateEnd = false;
				}
				if ( typeof (oData.Order.State) === "undefined" ) {
					oData.Order.State = 'init';
				}

				if (typeof (oData.Order.ForUpdate) === "undefined") {
					oData.Order.ForUpdate = false;
				}

				if (typeof (oData.Order.messageSet) === "undefined") {
					oData.Order.messageSet = [{
						TYPE: 'I',
						MESSAGE: 'Momentan nu sunt erori'
					}];
				}

				var i;
				for (i in oData.Order.COMPONENTS) {
					if (typeof (oData.Order.COMPONENTS[i].split) === "undefined") {
						oData.Order.COMPONENTS[i].split = false;
					}
					if (typeof (oData.Order.COMPONENTS[i].CHARG) === "undefined") {
						oData.Order.COMPONENTS[i].CHARG = '';
					}
				}

				if (oData.Order.HEADER.YELD == 0 || typeof (oData.Order.HEADER.YELD) === "undefined"){
					oData.Order.HEADER.YELD = oData.Order.HEADER.TOTAL_PLORD_QTY;
					var i;
					for (i in oData.Order.COMPONENTS) {
						oData.Order.COMPONENTS[i].CONF_QUAN =  oData.Order.COMPONENTS[i].REQ_QUAN;
					}	
				}
			 

				

				oView.getModel().setData(oData);

				jQuery.sap.require("sap.ui.model.Context");
				var newContext = new sap.ui.model.Context(oView.getModel(), "/ROOT/OBJ_COLLECTION/" + id);
				oView.setBindingContext(newContext);

			},

			/* =========================================================== */
			/* event handlers */
			/* =========================================================== */

			/**
			 * Event handler for navigating back. It checks if there is a history
			 * entry. If yes, history.go(-1) will happen. If not, it will replace
			 * the current entry of the browser history with the worklist route.
			 * 
			 * @public
			 */
			onNavBack: function() {
				var oHistory = History.getInstance();
				var sPreviousHash = oHistory.getPreviousHash();
				var oView = this.getView();
				var oModelOrder = oView.getModel("orderlist");
				var sNamespace = this.getOwnerComponent().getMetadata().getManifestEntry("sap.app").id;
				localStorage.setItem(sNamespace + '.orders', oModelOrder.getJSON());

				BarCodeScanner.disconnect();

				if (sPreviousHash !== undefined) {
					// The history contains a previous entry
					history.go(-1);
				} else {
					// Otherwise we go backwards with a forward
					// history
					var bReplace = true;
					var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
					var oViewOrderDetail = this.getView('orderlist');
					BarCodeScanner.connect(function(barcode) {
						oViewOrderDetail.on_scan(barcode);
					});
					oRouter.navTo("orderlist", {}, bReplace);
				}
			},

			messagePopoverOpen: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				jQuery.sap.require("sap.m.MessagePopover");
				jQuery.sap.require("sap.m.MessagePopoverItem");

				var oMessageTemplate = new sap.m.MessagePopoverItem({
					type: {
						path: 'TYPE',
						formatter: this.formatter.formatMessageType
					},
					title: {
						path: 'TYPE',
						formatter: this.formatter.formatMessageTitle
					},
					description: "{MESSAGE}"

				});

				var oMessagePopover1 = new sap.m.MessagePopover({
					items: {
						path: '/',
						template: oMessageTemplate
					}
				});

				var oModel = new JSONModel();
				oModel.setData(oData.Order.messageSet);

				oMessagePopover1.setModel(oModel);

				oMessagePopover1.openBy(oEvent.getSource());

				/*	
				this.oMessagePopover = sap.ui.xmlfragment( "sap.ui.pp.mobi.view.SAPResult", this);
				oView.addDependent(this.oMessagePopove);


				var oContext = oView.getBindingContext();
				this.oMessagePopover.setBindingContext(oContext);

				this.oMessagePopover.openBy(oEvent.getSource());
				 */
			},

			handleShowJSON: function(oEvent) {
				var oView = this.getView();
				var oModel = this.getView().getModel("orderlist");
				oView.byId("myJSON").setProperty('value', "" + oModel.getJSON());
			},

			onPressStart: function(oEvent) {
				this._ChangeStatus(oEvent, false, true, false, false);
			},

			onPressStartWork: function(oEvent) {
				this._ChangeStatus(oEvent, false, false, true, false);
			},

			onPressStopWork: function(oEvent) {
				this._ChangeStatus(oEvent, false, false, false, true);
			},

			onPressSave: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				this.confirmOrder(oData);
			},

			handleAddItem: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();

				var oComponentsList = oView.byId("componentsList");

				oComponentsList.setBusy(true);

				oData.Order.ForUpdate = true;
				oData.Order.COMPONENTS.push({
					'MATERIAL': '',
					'MATL_DESC': ''
				});

				oView.byId("dummy").setProperty('value', "" + oData.Order.COMPONENTS.length);

				oView.getModel().setData(oData);
				oComponentsList.getModel().refresh(); // asta nu are efect

				oComponentsList.setBusy(false);

			},
		

			doSplitItem: function(value){
				var oView = this.getView();
				var oData = oView.getModel().getData();	
				var rap = oData.Order.HEADER.YELD / oData.Order.HEADER.TOTAL_PLORD_QTY;
				var CONF_QUAN = rap * value.REQ_QUAN;
				oData.Order.ForUpdate = true;
				if (value.CONF_QUAN > 0 && value.REQ_QUAN > value.CONF_QUAN && CONF_QUAN > 0) {
					// se face o copie
					value.split = false;

					var new_value = $.extend(true, {}, value);

					var newREQ_QUAN = (value.REQ_QUAN * value.CONF_QUAN) / CONF_QUAN;

					new_value.REQ_QUAN = value.REQ_QUAN - newREQ_QUAN;
					value.REQ_QUAN = newREQ_QUAN;
					
					new_value.CONF_QUAN = rap * new_value.REQ_QUAN;
					new_value.CHARG = '';

					var index = 0;
					var com;
					for (com in oData.Order.COMPONENTS) {
						if (value.MATERIAL == oData.Order.COMPONENTS[com].MATERIAL) {
							index = com;
						}
					}
					//oData.Order.COMPONENTS.push( new_value )
					oData.Order.COMPONENTS.splice(index + 1, 0, new_value);
					
				}
					
			},

			handleSplitItem: function(oEvent) {
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oItem = oEvent.getSource();
				var oContext = oItem.getBindingContext();

				var value = oContext.getProperty();

				var oComponentsList = oView.byId("componentsList");

				oComponentsList.setBusy(true);
				this.doSplitItem(value);
				oItem.setBindingContext(oContext);
					oView.getModel().setData(oData);
					oComponentsList.getModel().refresh(); // asta nu are efect		
				oComponentsList.setBusy(false);
			},

			onError: function(msg) {
				var msg = 'Error' + msg;
				MessageToast.show(msg);
			},

			handleChangeYeld: function(oEvent) {
				var newValue = oEvent.getParameter("value");

				var oView = this.getView();
				var oData = oView.getModel().getData();

				var rap = newValue / oData.Order.HEADER.TOTAL_PLORD_QTY;

				var comp;
				for (comp in oData.Order.COMPONENTS) {
					oData.Order.COMPONENTS[comp].CONF_QUAN = rap * oData.Order.COMPONENTS[comp].REQ_QUAN;
				}
				oView.getModel().setData(oData);
			},

			confirmOrder: function(oData) {
				var oView = this.getView(),
					currentUser = oView.getModel("currentUser").getData(),
					oModelControls = oView.getModel("controls");

				if (currentUser.user) {
					// salvare date in SAP
					var oConfig = this.getOwnerComponent().getMetadata().getConfig();

					oView.setBusy(true);

					var url = oConfig.orderServer + "&resursa=" + currentUser.user + "&pass=" + currentUser.pass + "&detail=confirm";
					var oUpdateModel = new JSONModel();

					oUpdateModel.attachRequestCompleted(function(oEvent) {
						oView.setBusy(false);
						var success = oEvent.getParameter("success");
						if (success) {
							var oDataSAP = oUpdateModel.getData();
							console.log(oDataSAP);

							oModelControls.setProperty("/buttonMessagesText", oDataSAP.ROOT.RETURN.length);
							oModelControls.setProperty("/buttonMessagesType", "Emphasized");

							oData.Order.messageSet = oDataSAP.ROOT.RETURN.slice();

							if (oDataSAP.ROOT.SUCCESS == "false") {
								oData.Order.ForUpdate = true;
								MessageToast.show("Comanda confirmata cu succes");
							} else {
								oData.Order.ForUpdate = false;
								MessageToast.error("Comanda nu a fost confirmata. Va rugam sa varificat jurnalul de erori");
							}

						} else {
							MessageBox.error("Nu se poate accesa serverul de SAP");
						}

					});

					var oParameters = {
						"AUFNR": oData.Order.HEADER.ORDERID,
						"VORNR": "0010",
						"ISMNW_2": oData.Order.ActualWork,
						'ISMNU': 'MIN'
							// 'PERNR': ?????
					};
					oUpdateModel.loadData(url, oParameters, false, 'PUT');
				} else {
					oData.Order.ForUpdate = true;

				}

			},

			handleChangeConfQty: function(oEvent) {
				var newValue = oEvent.getParameter("value");
				var oView = this.getView();
				var oData = oView.getModel().getData();
				var oItem = oEvent.getSource();
				var oContext = oItem.getBindingContext();

				var value = oContext.getProperty();

				var rap = oData.Order.HEADER.YELD / oData.Order.HEADER.TOTAL_PLORD_QTY;
				var CONF_QUAN = rap * value.REQ_QUAN;

				value.split = (newValue < CONF_QUAN);

				oItem.setBindingContext(oContext);
			},

			handleValueRequestCharg: function(oController) {
				this.inputId = oController.oSource.sId;
				// create value help dialog

				var oItem = oController.getSource();
				var oContext = oItem.getBindingContext();
				var value = oContext.getProperty();
				this.MATERIAL = value.MATERIAL;

				if (!this._valueHelpDialog) {
					this._valueHelpDialog = sap.ui.xmlfragment(
						"sap.ui.pp.mobi.view.SHDialogCHARG",
						this
					);
					this.getView().addDependent(this._valueHelpDialog);

				}
				var oFilter = new Filter("MATERIAL", sap.ui.model.FilterOperator.EQ, value.MATERIAL);
				this._valueHelpDialog.getBinding("items").filter([oFilter]);
				// open value help dialog
				this._valueHelpDialog.open();
			},

			_handleValueHelpSearchCharg: function(oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilterMATERIAL = new Filter("MATERIAL", sap.ui.model.FilterOperator.Contains, this.MATERIAL);
				var oFilterCHARG = new Filter("CHARG", sap.ui.model.FilterOperator.Contains, sValue);
				oEvent.getSource().getBinding("items").filter([oFilterMATERIAL, oFilterCHARG]);
			},

			_handleValueHelpCloseCharg: function(oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");

				if (oSelectedItem) {
					var aContexts = oEvent.getParameter("selectedContexts");
					if (aContexts && aContexts.length) {
						var oContextCharg = aContexts[0];
						var valueCharg = oContextCharg.getProperty();
					}
					var productInput = this.getView().byId(this.inputId);
					productInput.setValue(oSelectedItem.getTitle());

					var oContext = productInput.getBindingContext();
					var value = oContext.getProperty();
					if (valueCharg.QTY < value.CONF_QUAN) {
						value.CONF_QUAN = valueCharg.QTY;
						value.split = true;
					}
					productInput.setBindingContext(oContext);

				}
				oEvent.getSource().getBinding("items").filter([]);
			},

			handleValueRequestMatnr: function(oController) {
				this.inputId = oController.oSource.sId;
				// create value help dialog

				if (!this._valueHelpDialog) {
					this._valueHelpDialog = sap.ui.xmlfragment(
						"sap.ui.pp.mobi.view.SHDialogMATNR",
						this
					);
					this.getView().addDependent(this._valueHelpDialog);
					//var oMaterialsModel = this.getOwnerComponent().getModel("MaterialsCollection");
					//this._valueHelpDialog.setModel(oMaterialsModel,"MaterialsCollection");			
				}

				// open value help dialog
				this._valueHelpDialog.open();
			},

			_handleValueHelpSearch: function(evt) {
				var sValue = evt.getParameter("value");
				var oFilter = new Filter(
					"Name",
					sap.ui.model.FilterOperator.Contains, sValue
				);
				evt.getSource().getBinding("items").filter([oFilter]);
			},

			_handleValueHelpClose: function(oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (oSelectedItem) {
					var productInput = this.getView().byId(this.inputId);
					productInput.setValue(oSelectedItem.getTitle());
					productInput.setDescription(oSelectedItem.getDescription());
				}
				oEvent.getSource().getBinding("items").filter([]);
			},

			_ChangeStatus: function(oEvent, StateInit, StateStart, StateWork, StateEnd) {
				that = this;
				var oView = this.getView();
				var oData = oView.getModel().getData();

				var oModelOrder = this.getView().getModel("orderlist");

				MessageBox.confirm("Sunteti sigur?", fnCallbackConfirm);

				function fnCallbackConfirm(bResult) {
					if (bResult) {
						oData.Order.StateInit = StateInit;
						oData.Order.StateStart = StateStart;
						oData.Order.StateWork = StateWork;
						oData.Order.StateEnd = StateEnd;

						// Show the appropriate action buttons
						oView.byId("start").setVisible(StateInit);

						oView.byId("start_work").setVisible(StateStart);

						oView.byId("stop_work").setVisible(StateWork);

						if (StateStart) {
							oData.Order.StartOn = new Date();
						}
						if (StateWork) {
							oData.Order.WorkOn = new Date();
						}
						if (StateEnd) {
							oData.Order.EndOn = new Date();
							oData.Order.ActualWork = (oData.Order.EndOn - oData.Order.StartOn) / (1000 * 60);
							that.confirmOrder(oData);
							oView.getModel().setData(oData);
						}
					}
				}

			}

		});

	});