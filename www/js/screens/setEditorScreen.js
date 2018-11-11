/*global de: false, libjsca: false, $: false, FileReader: false*/
de.setEditorScreen = new libjsca.ApplicationScreen("setEditorScreen");

de.setEditorScreen.init = function () {
    this.initInput();
    this.calculateWorldArea();
};

de.setEditorScreen.calculateWorldArea = function() {
    var x, y, width, height;

    x = $("#setEditorLeftPanelDiv").width() + de.MARGIN;
    y = $("#setEditorTopPanelDiv").height() + de.MARGIN;
    width = de.width - x - de.MARGIN;
    height = de.height - y - de.MARGIN;
    this.worldArea = new libjsca.Rectangle(x, y, width, height);
};

de.setEditorScreen.updateWorld = function() {
        if(de.setEditorScreen.setData.level.length < 1) {
            de.canvas.fillVerticalGradient("#000000", "#05009b");
            return;
        }
        this.world = new de.worldObject.World(de.setEditorScreen.setData.level[de.setEditorScreen.getSelectedLevelId()]);
        this.worldRenderer = new de.WorldRenderer(this.world, this.worldArea.x, this.worldArea.y, this.worldArea.width, this.worldArea.height);
        this.worldRenderer.draw();
};


de.setEditorScreen.refreshView = function () {
    var setComment, i;

    $("#setEditorNameP").text(this.setData.setName);
    $("#setEditorAuthorSpan").text(this.setData.author);

    setComment = this.setData.comment.length <= 10 ? this.setData.comment : this.setData.comment.slice(0, 9) + "...";
    $("#setEditorCommentSpan").text(setComment);

    $("#setEditorIdSpan").text(this.setData.setId);

    $("#setEditorLevelSelect").empty();
    for (i = 0; i < this.setData.level.length; i += 1) {
        var $option = $("<option />");
        // Add value and text to option
        $option.attr("value", i).text(i);
        // Add option to drop down list
        $("#setEditorLevelSelect").append($option);
    }

    // Disable level manipulation buttons if no levels existsInLocalStorage, except add.
    $(".setEditorLevelButton:not(#setEditorAddLevelButton)").prop("disabled", de.setEditorScreen.setData.level.length < 1);

    this.updateWorld();

};


de.setEditorScreen.initInput = function () {
    var action;

    this.inputControls = [];

    // LEFT PANEL

    //Clear
    action = function () {
        var dialogData;
        dialogData = {};
        dialogData.text = "Clear World data?";
        dialogData.ok = function () {
            de.setEditorScreen.createNew();
            de.setEditorScreen.refreshView();
            de.setApplicationScreen(de.setEditorScreen);
        };
        dialogData.cancel = function () {
            de.setApplicationScreen(de.setEditorScreen);
        };
        de.setApplicationScreen(de.dialogScreen, dialogData);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorLeftPanelClearButton"}));

    //Save
    action = function () {
        var jsonString = JSON.stringify(de.setEditorScreen.setData);
        var a = document.createElement("a");
        var file = new Blob([jsonString], {type: "text/plain"});
        saveAs(file, de.setEditorScreen.setData.setName + ".svenlevel");
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorLeftPanelSaveButton"}));

    //Load button (will redirect to Load File input button)
    action = function () {
        $("#dialogLoadFileInput").click();
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#dialogLoadFileButton"}));


    // Load File input button
    action = function () {
            var file, fileReader;
            file = $('#dialogLoadFileInput').get(0).files[0];
            if (file === undefined) {
                return;
            }

            fileReader = new FileReader();

            fileReader.onload = function () {
                de.setEditorScreen.setData = $.parseJSON(fileReader.result);
                de.setEditorScreen.refreshView();
            };

            fileReader.readAsText(file);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#dialogLoadFileInput", domEvent:"change"}));


    //Exit
    action = function () {
        de.setApplicationScreen(de.titleScreen);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorLeftPanelExitButton"}));


    // TOP PANEL

    // details...
    action = function () {
        var dialogData;
        dialogData = {};
        dialogData.text = "<p>Edit World Details</p>";
        dialogData.text += "<div><p>Name <span id=\"dialogSetDetailsErrorNameSpan\" style=\"color: red;\"></span></p><textarea id=\"dialogSetDetailsNameTextarea\" cols=\"30\" rows=\"1\" maxlength=\"30\" style=\"resize: none;\">" + de.setEditorScreen.setData.setName + "</textarea></div>";
        dialogData.text += "<div><p>Author <span id=\"dialogSetDetailsErrorAuthorSpan\" style=\"color: red;\"></span></p><textarea id=\"dialogSetDetailsAuthorTextarea\" cols=\"30\" rows=\"1\"  maxlength=\"30\" style=\"resize: none;\">" + de.setEditorScreen.setData.author + "</textarea></div>";
        dialogData.text += "<div><p>Comment <span id=\"dialogSetDetailsErrorCommentSpan\" style=\"color: red;\"></span></p><textarea id=\"dialogSetDetailsCommentTextarea\" cols=\"30\" rows=\"5\"  maxlength=\"150\" style=\"resize: none;\">" + de.setEditorScreen.setData.comment + "</textarea></div>";

        dialogData.ok = function () {
            var nameText, authorText, commentText, invalid;
            invalid = "Invalid, try again!";
            $("#dialogSetDetailsErrorNameSpan").text("");
            $("#dialogSetDetailsErrorAuthorSpan").text("");
            $("#dialogSetDetailsErrorCommentSpan").text("");

            nameText = $("#dialogSetDetailsNameTextarea").val();
            if (!de.assets.level.isValidSetName(nameText)) {
                $("#dialogSetDetailsErrorNameSpan").text(invalid);
                return;
            }

            authorText = $("#dialogSetDetailsAuthorTextarea").val();
            if (!de.assets.level.isValidSetAuthor(authorText)) {
                $("#dialogSetDetailsErrorAuthorSpan").text(invalid);
                return;
            }

            commentText = $("#dialogSetDetailsCommentTextarea").val();
            if (!de.assets.level.isValidSetComment(commentText)) {
                $("#dialogSetDetailsErrorCommentSpan").text(invalid);
                return;
            }

            de.setEditorScreen.setData.setName = nameText;
            de.setEditorScreen.setData.author = authorText;
            de.setEditorScreen.setData.comment = commentText;

            de.setEditorScreen.refreshView();

            de.setApplicationScreen(de.setEditorScreen);
        };
        dialogData.cancel = function () {
            de.setApplicationScreen(de.setEditorScreen);
        };

        de.setApplicationScreen(de.dialogScreen, dialogData);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorTopPanelEditButton"}));


    action = function() {
        var newUuid = libjsca.createUUID();
        de.setEditorScreen.setData.setId = newUuid;
        de.setEditorScreen.refreshView();

    };


    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorTopPanelNewUuidButton"}));



// Edit level

    action = function () {
        var selected = parseInt($("#setEditorLevelSelect option:selected").val(), 10);
        de.setApplicationScreen(de.levelEditorScreen, {setData : de.setEditorScreen.setData, level : selected});
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorEditLevelButton"}));

// Remove level

    action = function () {
        if (de.setEditorScreen.setData.level.length < 1) {
            return;
        }
        de.setEditorScreen.setData.level.splice(de.setEditorScreen.getSelectedLevelId(), 1);
        de.setEditorScreen.refreshView();
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorRemoveLevelButton"}));

    // Add Level

    action = function () {
        var dialogData, widthOptions, heightOptions, i;

        for(i = 4; i <= 18; i += 1) {
            widthOptions += "<option value=\"" + i + "\">" + i + "</option>";
        }
        for(i = 3; i <= 16; i += 1) {
            heightOptions += "<option value=\"" + i + "\">" + i + "</option>";
        }
        dialogData = {};
        dialogData.text = "<p>New Level Size</p>";
        dialogData.text += "<p>Width <select id=\"levelEditorSizeWidthSelect\">" + widthOptions + "</select></p>";
        dialogData.text += "<p>Height <select id=\"levelEditorSizeHeightSelect\">" + heightOptions + "</select></p>";

        dialogData.ok = function () {
            var width, height;

            width = $("#levelEditorSizeWidthSelect option:selected").attr("value");
            height = $("#levelEditorSizeHeightSelect option:selected").attr("value");

            de.setEditorScreen.setData.level.push(de.assets.level.createNewLevel(width, height));
            de.setEditorScreen.refreshView();

            de.setApplicationScreen(de.setEditorScreen);
        };
        dialogData.cancel = function () {
            de.setApplicationScreen(de.setEditorScreen);
        };

        de.setApplicationScreen(de.dialogScreen, dialogData);
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorAddLevelButton"}));

// setEditorLevelMoveUp
    action = function () {
        var selectedlevelId, swapTemp;
        selectedlevelId = de.setEditorScreen.getSelectedLevelId();
        if(selectedlevelId === 0)
        {
            return;
        }

        swapTemp = de.setEditorScreen.setData.level[selectedlevelId - 1];
        de.setEditorScreen.setData.level[selectedlevelId - 1] = de.setEditorScreen.setData.level[selectedlevelId];
        de.setEditorScreen.setData.level[selectedlevelId] = swapTemp;
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorLevelMoveUp"}));

//setEditorLevelMoveDown
    action = function () {
        var selectedlevelId, swapTemp;
        selectedlevelId = de.setEditorScreen.getSelectedLevelId();
        if(selectedlevelId >= de.setEditorScreen.setData.level.length -  1)
        {
            return;
        }

        swapTemp = de.setEditorScreen.setData.level[selectedlevelId + 1];
        de.setEditorScreen.setData.level[selectedlevelId + 1] = de.setEditorScreen.setData.level[selectedlevelId];
        de.setEditorScreen.setData.level[selectedlevelId] = swapTemp;
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorLevelMoveDown"}));

    // setEditorLevelSelect change
    action = function () {
        de.setEditorScreen.updateWorld();
    };

    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#setEditorLevelSelect", domEvent: "change"}));

};

de.setEditorScreen.getSelectedLevelId = function () {
    return parseInt($("#setEditorLevelSelect option:selected").val(), 10);
};


de.setEditorScreen.show = function () {
    if (!this.hasOwnProperty("setData")) {
        this.createNew();
        this.init();
    }

    this.refreshView();



};

de.setEditorScreen.createNew = function () {
    this.setData = {
        "setName": "",
        "author": "",
        "comment": "",
        "setId" : libjsca.createUUID(),
        "level": []
    };
};

de.setEditorScreen.hide = function () {
};

