/*global libjsca: false, de: false, $: false*/

de.dialogScreen = new libjsca.ApplicationScreen("dialogScreen");

de.dialogScreen.init = function(dialogData) {
    var dialogCancelButton;
    $("#dialogTextDiv").html(dialogData.text);
    this.inputControls = [];
    this.inputControls.push(new libjsca.InputControl(dialogData.ok, {domSelector: "#dialogOkButton", keycodes: [13]}));

    dialogCancelButton = $("#dialogCancelButton");
    if(typeof(dialogData.cancel) === "function") {
        dialogCancelButton.show();
        this.inputControls.push(new libjsca.InputControl(dialogData.cancel, {domSelector: "#dialogCancelButton", keycodes: [27]}));
    } else {
        dialogCancelButton.hide();
    }
};

/**
 *
 * @param {Object} dialogData
 */
de.dialogScreen.show = function(dialogData) {
    if(typeof(dialogData === "object")) {
        this.init(dialogData);
    }
};


de.dialogScreen.hide = function() {
};
