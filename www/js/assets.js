/*global de: true, $: false, libjsca: false*, Howl: false, Howler: false */

de.assets = {};


de.assets.level = {};
de.assets.level.isInitiated = false;

de.assets.level.addToSetList = function(set) {
    var setList, i, json;

    setList = libjsca.storage.parseJsonFromLocalStorage("setList");
    if(setList === null) {
        setList = [];
    }
    for(i = 0; i < setList.length; i += 1) {
        if(setList[i].setId === set) {
            return;
        }
    }
    setList.push(set);

    json = JSON.stringify(setList);
    window.localStorage.setItem("setList", json);
};

de.assets.level.init = function() {
    var setMap, customSets, i, setData, json;

    setMap = libjsca.storage.parseJsonFromFile("data/levels/map.json");
    this.data = [];
    for(i = 0; i < setMap.sets.length; i += 1) {
        setData = libjsca.storage.parseJsonFromFile("data/levels/" + setMap.sets[i]);
        setData.isBuiltIn = true; // mark built in sets
        this.data.push(setData);
    }

    customSets = libjsca.storage.parseJsonFromLocalStorage("customSets");
    if(customSets instanceof Array) {
        for (i = 0; i < customSets.length; i += 1) {
            customSets[i].isBuiltIn = false;
            this.data.push(customSets[i]);
        }
    } else {
        // add empty customSets array for later use
        window.localStorage.setItem("customSets", JSON.stringify([]));
    }

    // Add stats
    for(i = 0; i < this.data.length; i += 1) {
        setData = this.data[i];
        de.assets.level.addStats(setData);
    }

    this.isInitiated = true;
    de.assets.notifyIfInitiated();
};


de.assets.level.addStats = function(setData){
    setData.stats = libjsca.storage.existsInLocalStorage(setData.setId) ? libjsca.storage.parseJsonFromLocalStorage(setData.setId) : {};
};

de.assets.level.createNewLevel = function(width, height) {
    var levelData;

    levelData = {};
    levelData.objects = [];
    levelData.start = {x:0, y:0};
    levelData.width = width;
    levelData.height = height;

    return levelData;
};

de.assets.level.writeStats = function(setData) {
    window.localStorage.setItem(setData.setId, JSON.stringify(setData.stats));
};


de.assets.level.saveSet = function(setData) {
    var customSets, i, json, isUpdate;

    isUpdate = false;
    de.assets.level.addStats(setData);

    setData.isBuiltIn = false;

    //1st get map
    customSets = libjsca.storage.parseJsonFromLocalStorage("customSets");

    for(i = 0; i < customSets.length; i += 1) {
        // if already existsInLocalStorage with id: replace
        if(customSets[i].setId === setData.setId) {
            customSets[i] = setData;
            isUpdate = true;
            break;
        }
    }
    if(!isUpdate) {
        customSets.push(setData);
    }

    json = JSON.stringify(customSets);
    window.localStorage.setItem("customSets", json);
};

de.assets.level.removeSet = function(setId) {
    var i, customSets, json;
    for(i = 0; i < this.data.length; i += 1) {
        if(this.data[i].setId === setId) {
            this.data.splice(i, 1);
            window.localStorage.removeItem(setId);
            break;
        }
    }

    customSets = libjsca.storage.parseJsonFromLocalStorage("customSets");
    if(!(customSets instanceof Array)) {
        window.console.log("removeSet: Could not get custom sets");
        return;
    }

    for(i = 0; i < customSets.length; i += 1) {
        if(customSets[i].setId === setId) {
            customSets.splice(i, 1);
            break;
        }
    }

    json = JSON.stringify(customSets);
    window.localStorage.setItem("customSets", json);
};

de.assets.level.countCompletedLevels = function(setData) {
    return Object.keys(setData.stats).length;
};

de.assets.level.isValidSetName = function(setName) {
    return typeof(setName) === "string" && setName !== "";
};
de.assets.level.isValidSetAuthor = function(setAuthor) {
    return typeof(setAuthor) === "string" && setAuthor !== "";
};
de.assets.level.isValidSetComment = function(setComment) {
    return typeof(setComment) === "string";
};


de.assets.audio = {};
de.assets.audio.isInitiated = false;
de.assets.audio.music = {};
de.assets.audio.effects = {};
de.assets.audio.init = function() {
    this.effects.init();
    this.music.init();

    this.isInitiated = true;
    de.assets.notifyIfInitiated();

};


de.assets.audio.effects.init = function() {
    this.explode = new Howl({urls : ['data/audio/explode.wav']});
    this.die = new Howl({urls: ['data/audio/die.wav']});
    this.eat = new Howl({urls: ['data/audio/eat.wav']});
    this.doorOpen = new Howl({urls: ['data/audio/dooropen.wav']});
    this.doorClose = new Howl({urls: ['data/audio/doorclose.wav']});
    this.playerWalk = new Howl({urls: ['data/audio/walk.wav']});
    this.drag = new Howl({urls: ['data/audio/drag.wav']});
    this.roboWalk = new Howl({urls: ['data/audio/robowalk.wav']});
    this.buttonClick = new Howl({urls: ['data/audio/buttonclick.wav']});
    this.buttonClickOff = new Howl({urls: ['data/audio/buttonclickoff.wav']});
    this.switch = new Howl({urls: ['data/audio/switch.wav']});
    this.yeah = new Howl({urls: ['data/audio/yeah.wav']});
    this.teleport = new Howl({urls: ['data/audio/teleport.wav']});


    if(libjsca.storage.existsInLocalStorage("isEffectsEnabled")) {
        this.isEnabled = libjsca.storage.parseJsonFromLocalStorage("isEffectsEnabled");
    } else {
        this.isEnabled = true;
    }

};

de.assets.audio.music.init = function() {
    this.currentTrack = null;
    this.ingame = new Howl({urls : ['data/audio/ingame.ogg'], loop : true, volume : 0.6});


    if(libjsca.storage.existsInLocalStorage("isMusicEnabled")) {
        this.isEnabled = libjsca.storage.parseJsonFromLocalStorage("isMusicEnabled");
    } else {
        this.isEnabled = true;
    }

};

/**
 *
 * @param musicTrack <-- A Howl
 */
de.assets.audio.music.play = function(musicTrack) {
    if(!this.isEnabled || this.currentTrack === musicTrack) {
        return;
    }

    if (this.currentTrack instanceof Howl ) {
        this.currentTrack.stop();
    }

    this.currentTrack = musicTrack;
    musicTrack.play();
};

de.assets.audio.music.stop = function() {
    if (this.currentTrack instanceof Howl) {
        this.currentTrack.stop();
    }
    this.currentTrack = null;
};



// music
de.assets.audio.music.setEnabled = function(enabled) {
    var json;
    json = JSON.stringify(enabled);
    window.localStorage.setItem("isMusicEnabled", json);
    this.isEnabled = enabled;
};

de.assets.audio.effects.setEnabled = function(enabled) {
    var json;
    json = JSON.stringify(enabled);
    window.localStorage.setItem("isEffectsEnabled", json);
    this.isEnabled = enabled;
};


/**
 *
 * @param sound <-- A Howl
 */
de.assets.audio.effects.play = function(sound) {
  if(!this.isEnabled) {
      return;
  }
  sound.play();
};


de.assets.sprite = {};
de.assets.sprite.isInitiated = false;
de.assets.sprite.world = {};
de.assets.sprite.ui = {};
de.assets.sprite.init = function() {
    function onloadSheet() {
        var animationRegions, region1, region2, region3, region4, region5, region6, region7;

        // Player
        region1 = new libjsca.ImageRegion(this.sheet, 0, 140, 64, 64);
        region2 = new libjsca.ImageRegion(this.sheet, 70, 140, 64, 64);
        region3 = new libjsca.ImageRegion(this.sheet, 140, 140, 64, 64);
        animationRegions = [region1, region1, region1, region1, region1, region1, region2, region1, region1, region1, region1, region1, region1, region1, region1, region1, region1, region1, region3];
        this.world.player = new libjsca.Animation(animationRegions, 8000, true);

        // BounceRobot
        region1 = new libjsca.ImageRegion(this.sheet, 280, 70, 64, 64);
        region2 = new libjsca.ImageRegion(this.sheet, 350, 70, 64, 64);
        animationRegions = [ region1, region2 ];
        this.world.bounceRobot = new libjsca.Animation(animationRegions, 1000, true);

        //HulkRobot
        region1 = new libjsca.ImageRegion(this.sheet, 0, 350, 64, 64);
        region2 = new libjsca.ImageRegion(this.sheet, 70, 350, 64, 64);
        region3 = new libjsca.ImageRegion(this.sheet, 140, 350, 64, 64);
        region4 = new libjsca.ImageRegion(this.sheet, 210, 350, 64, 64);
        region5 = new libjsca.ImageRegion(this.sheet, 280, 350, 64, 64);

        animationRegions = [ region1,region1,region1,region1,region1,region1, region2, region3, region4, region5, region5 ];
        this.world.hulkRobot = new libjsca.Animation(animationRegions, 5000, true);

        //TowerRobot
        region1 = new libjsca.ImageRegion(this.sheet, 0, 420, 64, 64);
        region2 = new libjsca.ImageRegion(this.sheet, 70, 420, 64, 64);
        region3 = new libjsca.ImageRegion(this.sheet, 140, 420, 64, 64);

        animationRegions = [ region1,region2, region3, region2];
        this.world.towerRobot = new libjsca.Animation(animationRegions, 2000, true);

        // Explosion
        region1 = new libjsca.ImageRegion(this.sheet, 210, 140, 64, 64);
        region2 = new libjsca.ImageRegion(this.sheet, 280, 140, 64, 64);
        region3 = new libjsca.ImageRegion(this.sheet, 350, 140, 64, 64);
        animationRegions = [region1, region2, region3];
        this.world.explosion = new libjsca.Animation(animationRegions, 1000, false);

        // Hole
        region1 = new libjsca.ImageRegion(this.sheet, 2, 491, 62, 62);
        region2 = new libjsca.ImageRegion(this.sheet, 72, 491, 62, 62);
        region3 = new libjsca.ImageRegion(this.sheet, 142, 491, 62, 62);
        animationRegions = [region1, region3, region1, region1, region2, region1, region2, region1, region1];
        this.world.hole = new libjsca.Animation(animationRegions, 5000, true);

        // Death of player (re-uses explosion at the end)
        region1 = new libjsca.ImageRegion(this.sheet, 0, 210, 64, 64);
        region2 = new libjsca.ImageRegion(this.sheet, 70, 210, 64, 64);
        region3 = new libjsca.ImageRegion(this.sheet, 140, 210, 64, 64);
        region5 = new libjsca.ImageRegion(this.sheet, 210, 140, 64, 64);
        region6 = new libjsca.ImageRegion(this.sheet, 280, 140, 64, 64);
        region7 = new libjsca.ImageRegion(this.sheet, 350, 140, 64, 64);
        animationRegions = [region1, region2, region3, region5, region6, region7];
        this.world.playerDeath = new libjsca.Animation(animationRegions, 1000, false);

        // Rainbow
        region1 = new libjsca.ImageRegion(this.sheet, 0, 560, 62, 62);
        region2 = new libjsca.ImageRegion(this.sheet, 70, 560, 62, 62);
        region3 = new libjsca.ImageRegion(this.sheet, 140, 560, 62, 62);
        region4 = new libjsca.ImageRegion(this.sheet, 210, 560, 62, 62);
        region5 = new libjsca.ImageRegion(this.sheet, 280, 560, 62, 62);
        region6 = new libjsca.ImageRegion(this.sheet, 350, 560, 62, 62);
        animationRegions = [region1, region2, region3, region4, region5, region6, region5, region4, region3, region2];
        this.world.rainbow = new libjsca.Animation(animationRegions, 10000, true);


        this.world.targetRobotNeutral = new libjsca.ImageRegion(this.sheet, 0, 70, 64, 64);
        this.world.targetRobotLeft = new libjsca.ImageRegion(this.sheet, 70, 70, 64, 64);
        this.world.targetRobotRight = new libjsca.ImageRegion(this.sheet, 140, 70, 64, 64);
        this.world.wall = new libjsca.ImageRegion(this.sheet, 141, 5, 62, 62);
        this.world.box = new libjsca.ImageRegion(this.sheet, 70, 0, 64, 64);
        this.world.goal = new libjsca.ImageRegion(this.sheet, 421, 75, 62, 62);
        this.world.filledHole = new libjsca.ImageRegion(this.sheet, 211, 5, 62, 62);
        this.world.floor = new libjsca.ImageRegion(this.sheet, 1, 5, 62, 62);
        this.world.floorDark = new libjsca.ImageRegion(this.sheet, 631, 5, 62, 62);
        this.world.switchClosed = new libjsca.ImageRegion(this.sheet, 1, 285, 62, 62);
        this.world.switchOpen = new libjsca.ImageRegion(this.sheet, 71, 285, 62, 62);
        this.world.doorOpen = new libjsca.ImageRegion(this.sheet, 561, 5, 62, 62);
        this.world.doorClosed = new libjsca.ImageRegion(this.sheet, 491, 5, 62, 62);
        this.world.buttonClosed = new libjsca.ImageRegion(this.sheet, 351, 5, 62, 62);
        this.world.buttonOpen = new libjsca.ImageRegion(this.sheet, 421, 5, 62, 62);
        this.ui.controlRestart = new libjsca.ImageRegion(this.sheet, 0, 220, 30, 40);
        this.ui.controlExit = new libjsca.ImageRegion(this.sheet, 40, 220, 30, 40);
        this.ui.controlStop = new libjsca.ImageRegion(this.sheet, 80, 220, 30, 40);
        this.ui.controlInfo = new libjsca.ImageRegion(this.sheet, 120, 220, 30, 40);
        this.ui.scrollDown = new libjsca.ImageRegion(this.sheet, 200, 220, 38, 40);
        this.ui.scrollUp = new libjsca.ImageRegion(this.sheet, 150, 220, 38, 40);
        this.ui.goBack = new libjsca.ImageRegion(this.sheet, 250, 220, 40, 38);
        this.ui.title = new libjsca.ImageRegion(this.sheet, 0, 270, 420, 200);

        this.isInitiated = true;
        de.assets.notifyIfInitiated();
    }


    this.sheet = new Image();
    this.sheet.onload = onloadSheet.bind(this);
    this.sheet.src = "data/graphics/game_sprites.png";
};


de.assets.notifyIfInitiated = function() {
  // add other asset subsections to this condition
    if(de.assets.sprite.isInitiated && de.assets.level.isInitiated) {
      if(typeof (de.assets.onInit) === "function") {
          de.assets.onInit();
      }
  }
};

de.assets.init = function() {
    de.assets.sprite.init();
    de.assets.level.init();
    de.assets.audio.init();
};

