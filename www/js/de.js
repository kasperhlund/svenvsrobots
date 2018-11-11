/*global libjsca: false, $: false*/
var de = new libjsca.CanvasApplication();
de.version = "0.1.0";

de.MARGIN = 5;

$(document).ready(function(){
    de.assets.onInit = function() {
        de.init("myCanvas");
        de.setApplicationScreen(de.titleScreen);
    };

    de.assets.init();

});