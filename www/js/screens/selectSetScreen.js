/*global libjsca: false, de: false, $: false*/

de.selectSetScreen = new libjsca.ApplicationScreen("selectSetScreen");

de.selectSetScreen.init = function() {
    var action;
    this.data = de.assets.level.data;
    this.setIndex = 0;
    this.inputControls = [];

    // back button
    action = function() {
        de.assets.audio.music.stop();
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.titleScreen);
    };
    this.inputControls.push(new libjsca.InputControl(action, {domSelector: "#selectSetScreenBackImg", keycodes: [27]}));

    // left button
    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        this.setIndex = this.setIndex === 0 ? this.data.length - 1 : this.setIndex - 1;
        this.displaySet();
    };

    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#selectSetLeftDiv img", keycodes: [37]}));
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#selectSetScreen", domEvent: "swipeleft"}));



    // right button
    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        this.setIndex = this.setIndex === this.data.length - 1 ? 0 : this.setIndex + 1;
        this.displaySet();
    };

    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#selectSetRightDiv img", keycodes: [39]}));
    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#selectSetScreen", domEvent: "swiperight"}));

    // select set
    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        de.setApplicationScreen(de.selectLevelScreen, this.data[this.setIndex]);
    };

    this.inputControls.push(new libjsca.InputControl(action.bind(this), {domSelector: "#selectSetButton", keycodes: [13]}));

    // Import world
    action = function() {
        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        $("#selectSetImportInput").click();
    };
    this.inputControls.push(new libjsca.InputControl(action.bind(this),{domSelector: "#selectSetImportButton"}));

    action = function() {
        var file, fileReader;
        file = $("#selectSetImportInput").get(0).files[0];
        if (file === undefined) {
            return;
        }

        fileReader = new FileReader();

        fileReader.onload = function () {
            var setData;
            setData = $.parseJSON(fileReader.result);
            de.assets.level.saveSet(setData);
            de.selectSetScreen.data.push(setData);
            window.alert(setData.setName + " was imported!");
        };

        fileReader.readAsText(file);
    };

    this.inputControls.push(new libjsca.InputControl(action.bind(this),{domSelector: "#selectSetImportInput", domEvent:"change"}));

    // Delete World

    action = function () {
        var dialogData, dialogText, setData;

        de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
        setData = de.selectSetScreen.data[de.selectSetScreen.setIndex];

        if(setData.isBuiltIn) {
            window.alert("You can't remove built-in worlds!");
            return;
        }

        dialogText = "Really delete " + setData.setName + "?";
        dialogData = {};
        dialogData.text = "<p>" + dialogText + "</p>";

        dialogData.ok = function () {
            de.assets.level.removeSet(de.selectSetScreen.data[de.selectSetScreen.setIndex].setId);
            //de.setEditorScreen.refreshView();
            de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
            de.setApplicationScreen(de.selectSetScreen);
        };
        dialogData.cancel = function () {
            de.assets.audio.effects.play(de.assets.audio.effects.buttonClick);
            de.setApplicationScreen(de.selectSetScreen);
        };

        de.setApplicationScreen(de.dialogScreen, dialogData);
    };

    this.inputControls.push(new libjsca.InputControl(action.bind(this),{domSelector: "#selectSetDeleteButton"}));

    // end delete world

    this.displaySet();

    de.assets.audio.music.play(de.assets.audio.music.ingame);

};

de.selectSetScreen.displaySet = function() {
    var setData, completedText, completedCount;

    setData = this.data[this.setIndex];
    if(setData.isBuiltIn) {
        $("#selectSetDeleteButton").hide();
    } else {
        $("#selectSetDeleteButton").show();
    }

    $("#selectSetNameP").text(setData.setName);
    $("#selectSetAuthorP").text("By " + setData.author);
    $("#selectSetCommentP").text(setData.comment);

    completedCount = de.assets.level.countCompletedLevels(setData);
    if(completedCount === 0) {
        completedText = setData.level.length + " levels (new!)";
    } else {
        completedText = completedCount + " / " + setData.level.length + " done.";
    }
    $("#selectSetCompletedP").text(completedText);

};



de.selectSetScreen.show = function() {
        this.init();
};

de.selectSetScreen.hide = function() {

};

