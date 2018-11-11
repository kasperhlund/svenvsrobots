/*global de: false, libjsca: false*/

/**
 *
 * @param world
 * @param x - all available space for drawing world
 * @param y - all available space for drawing world
 * @param width - all available space for drawing world
 * @param height - all available space for drawing world
 * @constructor
 */
de.WorldRenderer = function(world, x, y, width, height) {
  var i, j, maxGridWidth, maxGridHeight, floorImage;
  this.world = world;
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.preRenderCanvas = new libjsca.Canvas(null, de.width, de.height);
  this.stopWatch = new libjsca.StopWatch();
  this.stopWatch.start();

  this.preRenderCanvas.fillVerticalGradient("#000000", "#05009b");

  // Now only focus on the playing area, after the background has been drawn.
  this.width = this.width - de.MARGIN*2;
  this.height = this.height - de.MARGIN*2;
  maxGridWidth = Math.floor(this.width / this.world.width);
  maxGridHeight = Math.floor(this.height / this.world.height);
  this.gridSize = Math.min(maxGridWidth, maxGridHeight);

  this.x += Math.abs(this.width/2 - this.gridSize*this.world.width/2);
  this.y += Math.abs(this.height/2 - this.gridSize*this.world.height/2) + de.MARGIN;


  this.worldCoveredArea = new libjsca.Rectangle(this.x, this.y, this.width, this.height);

   // render static stuff
    // draw grid.
    // TODO: draw Wall here also
    for(i = 0; i < this.world.width; i += 1) {
        for(j = 0; j < this.world.height; j += 1) {
            floorImage = (i + j) % 2 === 0 ? de.assets.sprite.world.floor : de.assets.sprite.world.floorDark;
            this.preRenderCanvas.drawImageRegion(floorImage, i * this.gridSize + this.x, j * this.gridSize + this.y, this.gridSize, this.gridSize);
        }
    }
};

de.WorldRenderer.prototype.draw = function() {
    var immovables, movables, timeNow, that;

    timeNow = this.stopWatch.getTimePassed();
    that = this;

    de.canvas.drawCanvas(this.preRenderCanvas);

    // first draw immovable objects so that movable appears on top
    immovables = this.world.inGameObjects.list.filter(function(element) {
        return !element.isMovable;
    });
    immovables.forEach(function(element) {
        that.drawInGameObject(element, timeNow);
    });

    movables = this.world.inGameObjects.list.filter(function(element) {
        return element.isMovable;
    });
    movables.forEach(function(element) {
        if(!(element instanceof de.worldObject.Player)) {
            that.drawInGameObject(element, timeNow);
        }
    });

    this.world.updateActions.forEach(function(updateAction) {
        that.drawAction(updateAction);
    });


    // player always visible
    this.drawInGameObject(this.world.player, timeNow);


};

de.WorldRenderer.prototype.drawInGameObject = function(inGameObject, timeNow) {
    var pCanvas, imageRegion;
    pCanvas = new libjsca.Point(inGameObject.point.x, inGameObject.point.y);
    pCanvas.multiply(this.gridSize);

    imageRegion = null;
    if(inGameObject instanceof de.worldObject.Player) {
        if(inGameObject.isDead) {
            imageRegion = de.assets.sprite.world.playerDeath.getImageRegion(inGameObject.deathWatch.getTimePassed());
        } else {
            imageRegion = de.assets.sprite.world.player.getImageRegion(timeNow);
        }
    } else if(inGameObject instanceof de.worldObject.TargetRobot) {
        if(inGameObject.targetMode.current === inGameObject.targetMode.ENUM.NEUTRAL) {
            imageRegion = de.assets.sprite.world.targetRobotNeutral;
        } else if(inGameObject.targetMode.current === inGameObject.targetMode.ENUM.RIGHT) {
            imageRegion = de.assets.sprite.world.targetRobotRight;
        } else {
            imageRegion = de.assets.sprite.world.targetRobotLeft;
        }
    } else if(inGameObject instanceof de.worldObject.BounceRobot) {
        imageRegion = de.assets.sprite.world.bounceRobot.getImageRegion(timeNow);
    } else if(inGameObject instanceof de.worldObject.Box) {
        imageRegion = de.assets.sprite.world.box;
    } else if(inGameObject instanceof de.worldObject.Wall) {
        imageRegion = de.assets.sprite.world.wall;
    } else if(inGameObject instanceof de.worldObject.Hole) {
        imageRegion = imageRegion = de.assets.sprite.world.hole.getImageRegion(timeNow);
    } else if(inGameObject instanceof  de.worldObject.FilledHole) {
        imageRegion = de.assets.sprite.world.filledHole;
    } else if(inGameObject instanceof de.worldObject.Goal) {
        imageRegion = de.assets.sprite.world.goal;
    } else if(inGameObject instanceof de.worldObject.Switch) {
        imageRegion = inGameObject.isActive ? de.assets.sprite.world.switchOpen : de.assets.sprite.world.switchClosed;
    } else if(inGameObject instanceof de.worldObject.Door) {
        imageRegion = inGameObject.isActive ? de.assets.sprite.world.doorOpen : de.assets.sprite.world.doorClosed;
    } else if(inGameObject instanceof de.worldObject.TowerRobot) {
        imageRegion = de.assets.sprite.world.towerRobot.getImageRegion(timeNow);
    } else if(inGameObject instanceof de.worldObject.HulkRobot) {
        imageRegion = de.assets.sprite.world.hulkRobot.getImageRegion(timeNow);
    } else if(inGameObject instanceof de.worldObject.Button) {
        imageRegion = inGameObject.isActive ? de.assets.sprite.world.buttonOpen : de.assets.sprite.world.buttonClosed;
    } else if(inGameObject instanceof de.worldObject.Rainbow) {
        imageRegion = de.assets.sprite.world.rainbow.getImageRegion(timeNow);
    }

    if(imageRegion !== null) {
        de.canvas.drawImageRegion(imageRegion, pCanvas.x + 1 + this.x, pCanvas.y + 1 + this.y, this.gridSize - 2, this.gridSize - 2);
    } else {
        throw new Error("can't find imageRegion for inGameObject");
    }

};

de.WorldRenderer.prototype.drawAction = function(action) {
    var pCanvas, imageRegion;

    if(!action.hasOwnProperty("point")) {
        return;
    }

    pCanvas = action.point.clone();
    pCanvas.multiply(this.gridSize);

    if(action instanceof de.worldObject.actions.ExplodeAction) {
        imageRegion = de.assets.sprite.world.explosion.getImageRegion(action.stopWatch.getTimePassed());
    }

    de.canvas.drawImageRegion(imageRegion, pCanvas.x + 1 + this.x, pCanvas.y + 1 + this.y, this.gridSize - 2, this.gridSize - 2);
};


de.WorldRenderer.prototype.getFullArea = function() {
    return new libjsca.Rectangle(this.x, this.y, this.width, this.height);
};


de.WorldRenderer.prototype.getWorldCoveredArea = function() {
    return this.worldCoveredArea;
};

/**
 *
 * @param {libjsca.Point} screenPoint
 * @return {null|libjsca.Point}
 */
de.WorldRenderer.prototype.getGridPointFromScreenPoint = function(screenPoint) {
    var worldScreenX, worldScreenY, gridPointX, gridPointY;
    if(!this.worldCoveredArea.contains(screenPoint)) {
        return null;
    }

    worldScreenX = screenPoint.x - this.x;
    worldScreenY = screenPoint.y - this.y;

    gridPointX = Math.floor(worldScreenX / this.gridSize);
    gridPointY = Math.floor(worldScreenY / this.gridSize);

    return new libjsca.Point(gridPointX, gridPointY);
};

