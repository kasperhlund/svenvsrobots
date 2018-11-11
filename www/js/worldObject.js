/*global de: true, libjsca: false, astar: false, GridNode: false, Graph: false */

de.worldObject = {};

de.worldObject.World = function(levelData) {
    var element, i;
    if(typeof(levelData) !== "object") {
        throw new Error("levelData not an object.");
    }

    this.width = levelData.width;
    this.height = levelData.height;
    this.inGameObjects = new de.worldObject.InGameObjectList(this);
    this.isBusy = false;
    this.steps = 0;
    this.updateActions = [];
    this.isDoorOpen = null; // decided later

    if(!(levelData.objects instanceof Array)) {
        throw new Error("levelData.objects not defined.");
    }

    for(i = 0; i < levelData.objects.length; i += 1) {
        element = levelData.objects[i];
        this.inGameObjects.addObject(element);
    }

    if(typeof(levelData.start.x) !== "number" || typeof(levelData.start.y) !== "number") {
        throw new Error("levelData.start.x and/or levelData.start.y is not a number.");
    }

    this.player = new de.worldObject.Player(new libjsca.Point(levelData.start.x, levelData.start.y), this);
    // Player is always first!
    this.inGameObjects.list.unshift(this.player);

    this.stopWatch = new libjsca.StopWatch();

    this.updateDoors(false);

    window.console.log("world init done");

};

de.worldObject.World.prototype.MOVE = {
    LEFT:new libjsca.Point(-1, 0),
    RIGHT:new libjsca.Point(1, 0),
    UP:new libjsca.Point(0, -1),
    DOWN:new libjsca.Point(0, 1),
    DOWN_LEFT:new libjsca.Point(-1, 1),
    DOWN_RIGHT:new libjsca.Point(1, 1),
    UP_LEFT:new libjsca.Point(-1, -1),
    UP_RIGHT:new libjsca.Point(1, -1),
    STAY:new libjsca.Point(0, 0)
};

de.worldObject.World.prototype.update = function(playerMove) {
    if(this.isBusy) {
        throw(new Error("Trying to update while updating."));
    }
    this.isBusy = true;
    this.player.moveRequest = playerMove;
    this.updateInGameObjects = new de.worldObject.InGameObjectList(this);
    this.updateInGameObjects.list = this.inGameObjects.list.filter(function(inGameObject) {
       return inGameObject.canUpdate;
    });
    this.updateActions = [];
    this.stopWatch.start();
    this.updateJobRef = window.setInterval(this.updateJob.bind(this), 0);
};

/**
 * Should be started with a this.updateJobRef = window.setInterval(this.updateJob.bind(this), 0)
 * to allow for rendering during an update. endUpdateJob() will clearInterval this.updateJobRef when done.
 *
 */
de.worldObject.World.prototype.updateJob = function() {
    var updateList, updateObject;
    this.updateInGameObjects.clean();
    this.inGameObjects.clean();

    this.updateInGameObjects.sort();

    if(this.updateInGameObjects.list.length === 0 && this.updateActions.length === 0) {
        this.endUpdateJob();
        return;
    }

    // process actions before inGameObjects
    updateList = this.updateActions.length > 0 ? this.updateActions : this.updateInGameObjects.list;
    updateObject = updateList[0];
    if(updateObject.update()) {
        updateList.splice(0,1);
    }
};

de.worldObject.World.prototype.endUpdateJob = function() {
    this.isBusy = false;
    window.clearInterval(this.updateJobRef);
    this.inGameObjects.clean();
};

de.worldObject.World.prototype.handleCollisions = function(point) {
    var inGameObjects, that, rainbows, toRainbow;
    that = this;
    inGameObjects = this.inGameObjects.getInGameObjectsAt(point);
    if (inGameObjects.has(de.worldObject.Player)) {
        if (inGameObjects.has(de.worldObject.Robot || inGameObjects.has(de.worldObject.Hole))) {
            this.player.deactivate();
            return;
        }
        if (inGameObjects.has(de.worldObject.Goal)) {
            de.worldScreen.levelCompleted();
            return;
        }
    }

    // more than one robot? deactivate all robots and add explodeaction.
    if (inGameObjects.count(de.worldObject.Robot) > 1) {
        inGameObjects.list.forEach(function (inGameObject) {
            inGameObject.isActive = false;
        });
        this.updateActions.push(new de.worldObject.actions.ExplodeAction(point));
    }

    if (inGameObjects.has(de.worldObject.Switch)) {
        inGameObjects.list.forEach(function (inGameObject) {
            if (inGameObject instanceof de.worldObject.Switch) {
                inGameObject.isActive = !inGameObject.isActive;
                de.assets.audio.effects.play(de.assets.audio.effects.switch);
                that.updateDoors(true);
            }
        });
    }

    if (inGameObjects.has(de.worldObject.Hole)) {
        inGameObjects.list.forEach(function (inGameObject) {
            if (inGameObject instanceof de.worldObject.Player) {
                inGameObject.deactivate();
                return;
            } else if (inGameObject instanceof de.worldObject.Box || inGameObject instanceof de.worldObject.Robot ) {
                inGameObjects.getFirstOfType(de.worldObject.Hole).deactivate();
                inGameObject.deactivate();
                that.inGameObjects.addObject({"type": "FilledHole", "x": point.x, "y": point.y});
                de.assets.audio.effects.play(de.assets.audio.effects.eat);
                return;
            }
        });
    }
    if(inGameObjects.has(de.worldObject.Rainbow)) {
        // go to closest
        rainbows = this.inGameObjects.filter(de.worldObject.Rainbow).list.sort(function(a, b) {
            var distA, distB;
            distA = point.getDistanceTo(a.point);
            distB = point.getDistanceTo(b.point);
            return distA - distB;
        });
        toRainbow = rainbows.length > 1 ? rainbows[1] : rainbows[0];
        inGameObjects.list.forEach(function (inGameObject) {
            if(!(inGameObject instanceof de.worldObject.Rainbow) && !(inGameObject instanceof de.worldObject.Box)) {
                inGameObject.point = toRainbow.point.clone();
                de.assets.audio.effects.play(de.assets.audio.effects.teleport);
            }
        });
        }

};

/***
 * @param inGameObject
 * @param move
 * @returns {boolean}
 */
de.worldObject.World.prototype.startMove = function(inGameObject, move) {
    var occupantObjects, newPosition, box;

    if(move.x === 0 && move.y === 0) {
        return true;
    }

    if(this.isPossibleMove(inGameObject, move)) {
        newPosition = inGameObject.point.clone();
        newPosition.add(move);
        // what is in the new point
        occupantObjects = this.inGameObjects.getInGameObjectsAt(newPosition);
        // if is a box it will be moved also
        if(occupantObjects.has(de.worldObject.Box)) {
            box = occupantObjects.filter(de.worldObject.Box).get(0);
            this.startMove(box, move);
        }
        inGameObject.world.updateActions.push(new de.worldObject.actions.MoveAction(inGameObject, move));
        return true;
    }
    return false;
};

// actions must have an update function
de.worldObject.actions = {};
de.worldObject.actions.MoveAction = function(inGameObject, move) {
    var finalDestination;
    this.inGameObject = inGameObject;
    this.move = move;
    this.originalPosition = this.inGameObject.point.clone();
    this.elapsedQuota = 0;
    this.stopWatch = new libjsca.StopWatch();
    // the objects that the inGameObject will eventually collide with
    finalDestination = this.inGameObject.point.clone();
    finalDestination.add(move);
    this.occupantObjects = this.inGameObject.world.inGameObjects.getInGameObjectsAt(finalDestination);
};
    de.worldObject.actions.MoveAction.prototype.update = function() {
    var moveOffset, moveDelay;
    if (!this.stopWatch.isRunning) {
        this.stopWatch.start();
        de.assets.audio.effects.play(this.inGameObject.sound);
    }
        if(this.inGameObject instanceof de.worldObject.Player) {
            moveDelay = 100;
        } else if(this.inGameObject instanceof de.worldObject.Robot) {
            moveDelay = 300 / this.inGameObject.world.inGameObjects.count(de.worldObject.Robot);
        } else {
            moveDelay = 200; // it is a box
        }

    // calc how close to complete move
    this.elapsedQuota = this.stopWatch.getTimePassed() / moveDelay;
    // move is ongoing?
    if (this.elapsedQuota < 1) {
        this.inGameObject.point = this.originalPosition.clone();
        moveOffset = this.move.clone();
        moveOffset.multiply(this.elapsedQuota);
        this.inGameObject.point.add(moveOffset);
        return false;
    }
    // move is done
    this.inGameObject.point = this.originalPosition;
    this.inGameObject.point.add(this.move);
    this.inGameObject.world.handleCollisions(this.inGameObject.point);
    return true;
};

de.worldObject.actions.ExplodeAction = function(point) {
    this.point = point;
    this.stopWatch = new libjsca.StopWatch();
};

de.worldObject.actions.ExplodeAction.prototype.update = function() {
    if (!this.stopWatch.isRunning) {
        this.stopWatch.start();
        de.assets.audio.effects.play(de.assets.audio.effects.explode);
    }
    if(this.stopWatch.getTimePassed() >= 1000 ) {
        return true;
    }
    return false;
};

de.worldObject.actions.InfoAction = function(world) {
    this.stopWatch = new libjsca.StopWatch();
    this.world = world;
    this.inGameObject = this.world.player;
};

de.worldObject.actions.InfoAction.update = function() {
    if (!this.stopWatch.isRunning) {
        this.stopWatch.start();
    }
    if(this.world.updateInGameObjects.list.length === 0) {
        return true;
    }




};


de.worldObject.World.prototype.isPossibleMove = function(inGameObject, move) {
    var newPosition, occupantObjects, that;

    function isWithinBorder(point) {
        return point.x >= 0 && point.x < that.width && point.y >= 0 && point.y < that.height;
    }

    that = this;

    if(move.x === 0 && move.y === 0) {
        return true;
    }

    newPosition = inGameObject.point.clone();
    newPosition.add(move);

    // what is in the new point
    occupantObjects = this.inGameObjects.getInGameObjectsAt(newPosition);

    // Boxes..
    if(inGameObject instanceof de.worldObject.Box) {
        // Boxes can not be moved to robots and player
        if(occupantObjects.has(de.worldObject.Robot) || occupantObjects.has(de.worldObject.Player)) {
            return false;
        }

    }

    // boxes are tricky.
    if(occupantObjects.has(de.worldObject.Box)) {
        // a box cannot move another box
        if(inGameObject instanceof de.worldObject.Box) {
            return false;
        }
        // they can not be moved diagonally.
        if(move.x * move.y !== 0) {
            return false;
        }
        //the new point for the box must be possible.
        if(!this.isPossibleMove(occupantObjects.filter(de.worldObject.Box).get(0), move)) {
            return false;
        }
    }

    // nothing can move to a wall
    if(occupantObjects.has(de.worldObject.Wall)) {
        return false;
    }

    // Doors needs to be open (active)
    if(occupantObjects.has(de.worldObject.Door)) {
        if(!occupantObjects.filter(de.worldObject.Door).get(0).isActive) {
            return false;
        }
    }

    return isWithinBorder(newPosition);
};

/**
 * If all switches AND buttons are active open doors else close doors
 */
de.worldObject.World.prototype.updateDoors = function(doPlaySound) {
    var switches, doors, buttons, areSwitchesActive, areButtonsActive, previous, audioClip, that;
    that = this;
    switches = this.inGameObjects.filter(de.worldObject.Switch);
    areSwitchesActive = switches.list.every(function(element) {
        return element.isActive;
    });

    buttons = this.inGameObjects.filter(de.worldObject.Button);
    areButtonsActive = buttons.list.every(function(element) {
        return element.isActive;
    });

    previous = this.isDoorOpen;
    this.isDoorOpen = areButtonsActive && areSwitchesActive;

    if(this.isDoorOpen !== previous && this.isDoorOpen !== null && doPlaySound) {
        audioClip = this.isDoorOpen ? de.assets.audio.effects.doorOpen : de.assets.audio.effects.doorClose;
        de.assets.audio.effects.play(audioClip);
    }

    doors = this.inGameObjects.filter(de.worldObject.Door);
    doors.list.forEach(function(door) {
        door.setActiveState(that.isDoorOpen);
    });

};



/**
 *  InGameObject
 */
de.worldObject.InGameObject = function(point, world) {
    this.point = point;
    this.world = world;
    this.isActive = true;
};

de.worldObject.InGameObject.prototype.update = function() {
    return true;
};

de.worldObject.InGameObject.prototype.deactivate = function() {
    this.isActive = false;
};

de.worldObject.InGameObject.prototype.isRemovable = false;
de.worldObject.InGameObject.prototype.isMovable = false;

de.worldObject.Rainbow = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
};
de.worldObject.Rainbow.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Rainbow.prototype.constructor = de.worldObject.Rainbow;


de.worldObject.Wall = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
};

de.worldObject.Wall.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Wall.prototype.constructor = de.worldObject.Wall;

de.worldObject.FilledHole = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
};

de.worldObject.FilledHole.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.FilledHole.prototype.constructor = de.worldObject.FilledHole;

de.worldObject.Goal = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
};

de.worldObject.Goal.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Goal.prototype.constructor = de.worldObject.Goal;

/**
 * Box
 */
de.worldObject.Box = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
    this.sound = de.assets.audio.effects.drag;
};

de.worldObject.Box.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Box.prototype.constructor = de.worldObject.Box;
de.worldObject.Box.prototype.isRemovable = true;
de.worldObject.Box.prototype.isMovable = true;

de.worldObject.Hole = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
};

de.worldObject.Hole.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Hole.prototype.constructor = de.worldObject.Hole;
de.worldObject.Hole.prototype.isRemovable = true;

de.worldObject.Door = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
    this.isActive = false; // active = false means closed door
};

de.worldObject.Door.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Door.prototype.constructor = de.worldObject.Door;
de.worldObject.Door.prototype.setActiveState = function(isActive) {
    var inGameObjectList, that;
    that = this;
    if(this.isActive === isActive) {
        return;
    }

    // isActive == true means door is open
    this.isActive = isActive;
    if(!this.isActive) {
        // Kill everything that is at door when it closes
        inGameObjectList = this.world.inGameObjects.getInGameObjectsAt(this.point);
        inGameObjectList.list.forEach(function(inGameObject) {
            if(!( inGameObject instanceof de.worldObject.Door)) {
                inGameObject.deactivate();
                that.world.updateActions.push(new de.worldObject.actions.ExplodeAction(that.point));
            }

        });

    }
};

de.worldObject.Button = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
    this.isActive = false;
};

de.worldObject.Button.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Button.prototype.constructor = de.worldObject.Button;
de.worldObject.Button.prototype.canUpdate = true;

de.worldObject.Button.prototype.update = function() {
    var previous, audioClip;
    previous = this.isActive;
    this.isActive = this.world.inGameObjects.getInGameObjectsAt(this.point).list.length > 1;

    if(previous !== this.isActive)
    {
        audioClip = this.isActive ? de.assets.audio.effects.buttonClick : de.assets.audio.effects.buttonClickOff;
        de.assets.audio.effects.play(audioClip);
    }

    this.world.updateDoors(true);
    return true;
};

de.worldObject.Switch = function(point, world, isActiveFromStart) {
    de.worldObject.InGameObject.call(this, point, world);
    this.isActive = isActiveFromStart;
};

de.worldObject.Switch.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Switch.prototype.constructor = de.worldObject.Switch;

/**
 * Player
 */
de.worldObject.Player = function(point, world) {
    de.worldObject.InGameObject.call(this, point, world);
    this.moveRequest = de.worldObject.World.prototype.MOVE.STAY;
    this.sound = de.assets.audio.effects.playerWalk;
};

de.worldObject.Player.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Player.prototype.constructor = de.worldObject.Player;
de.worldObject.Player.prototype.isMovable = true;
de.worldObject.Player.prototype.canUpdate = true;
de.worldObject.Player.prototype.update = function() {
    this.world.steps += 1;
    this.world.startMove(this, this.moveRequest);
    return true;
};
de.worldObject.Player.prototype.deactivate = function() {
    this.isDead = true;
    this.deathWatch = new libjsca.StopWatch();
    this.deathWatch.start();
    de.assets.audio.effects.play(de.assets.audio.effects.die);
    de.worldScreen.playerDeath();
};

/**
 * Robot
 */
de.worldObject.Robot = function(point, world) {
    if(arguments.length === 0) {
        return;
    }

    this.sound = de.assets.audio.effects.roboWalk;
    //http://www.klauskomenda.com/code/javascript-inheritance-by-example/
    de.worldObject.InGameObject.call(this, point, world);
    //this.isUpdating = false;
    //this.updateStartTime = null;
};

de.worldObject.Robot.prototype = new de.worldObject.InGameObject(null, null);
de.worldObject.Robot.prototype.constructor = de.worldObject.Robot;
de.worldObject.Robot.prototype.isMovable = true;
de.worldObject.Robot.prototype.canUpdate = true;
de.worldObject.Robot.prototype.isExploding = false;
de.worldObject.Robot.prototype.update = function() {
    throw new Error("undefined update for robot");
};

de.worldObject.Robot.prototype.getShortestPathToPlayer = function(movesDiagonally) {
    var x, y, grid, inGameObjects, graph, startNode, endNode;

    function canMoveHere(inGameObjectsHere) {
        var i, inGameObject;
        for(i = 0; i < inGameObjectsHere.list.length; i+=1) {
            inGameObject = inGameObjectsHere.list[i];
            if(inGameObject instanceof de.worldObject.Door && !inGameObject.isActive) {
                return false;
            }
        }
        return !inGameObjectsHere.has(de.worldObject.Wall) && !inGameObjectsHere.has(de.worldObject.Box);
    }

    //Init grid
    grid = new Array(this.world.width);
    for(x = 0; x < this.world.width; x += 1) {
        grid[x] = new Array(this.world.height);
        for(y = 0; y < this.world.height; y += 1) {
            inGameObjects = this.world.inGameObjects.getInGameObjectsAt(new libjsca.Point(x,y));
            if(canMoveHere(inGameObjects)) {
                grid[x][y] = 1;
            } else {
                grid[x][y] = 0;
            }
        }
    }
    graph = new Graph(grid, {diagonal : movesDiagonally});
    startNode = new GridNode(this.point.x, this.point.y, 1);
    astar.cleanNode(startNode);

    endNode = new GridNode(this.world.player.point.x, this.world.player.point.y);
    astar.cleanNode(endNode);

    return astar.search(graph, startNode, endNode, {heuristic : movesDiagonally ? astar.heuristics.diagonal : astar.heuristics.manhattan, closest : false});
};

/**
 * Given a wanted path of coordinates return the first one in steps from robot's perspective
 * @param path
 * @returns {*}
 */
de.worldObject.Robot.prototype.getNextStepFrompath = function(path) {
    return path.length === 0 ?  de.worldObject.World.prototype.MOVE.STAY : new libjsca.Point(path[0].x - this.point.x, path[0].y - this.point.y);
};

de.worldObject.Robot.prototype.isRemovable = true;

de.worldObject.BounceRobot = function(point, world) {
    de.worldObject.Robot.call(this, point, world);
};

de.worldObject.BounceRobot.prototype = new de.worldObject.Robot(null, null);
de.worldObject.BounceRobot.prototype.constructor = de.worldObject.BounceRobot;

de.worldObject.BounceRobot.prototype.update = function() {
    //TODO: make a Point.isStraightLine(point) function
    function isStraight(movement) {
        return movement.x * movement.y === 0 && (movement.x !== 0 || movement.y !== 0);
    }
    var move;

    if(!this.isActive) {
        return true;
    }

    move = this.world.player.point.clone();
    move.subtract(this.point);
    move.reduceToSign();

    if(!isStraight(move)) {
        return true;
    }
    this.world.startMove(this, move);
    return true;

};

de.worldObject.TargetRobot = function(point, world) {
    de.worldObject.Robot.call(this, point, world);
};

de.worldObject.TargetRobot.prototype = new de.worldObject.Robot(null, null);
de.worldObject.TargetRobot.prototype.constructor = de.worldObject.TargetRobot;
de.worldObject.TargetRobot.prototype.update = function() {
    var direction; // direction is used to tell which way the robot eye will look AKA targetmode
    if(!this.isActive) {
        return true;
    }
    direction = this.world.player.point.clone();
    direction.subtract(this.point);
    direction.reduceToSign();
    if(direction.x === 0) {
        this.targetMode.current = this.targetMode.ENUM.NEUTRAL;
    } else if(direction.x < 0) {
        this.targetMode.current = this.targetMode.ENUM.LEFT;
    } else {
        this.targetMode.current = this.targetMode.ENUM.RIGHT;
    }
    this.world.startMove(this, this.getNextStepFrompath(this.getShortestPathToPlayer(false)));
    return true;
};

de.worldObject.TargetRobot.prototype.targetMode = {};
de.worldObject.TargetRobot.prototype.targetMode.ENUM = {
    LEFT:"LEFT",
    RIGHT:"RIGHT",
    NEUTRAL:"NEUTRAL"
};

de.worldObject.TargetRobot.prototype.targetMode.current = de.worldObject.TargetRobot.prototype.targetMode.ENUM.NEUTRAL;

de.worldObject.HulkRobot = function(point, world, pattern) {
    de.worldObject.Robot.call(this, point, world);
    this.pattern = pattern;
    this.stepIndex = 0;
};

de.worldObject.HulkRobot.prototype = new de.worldObject.Robot(null, null);
de.worldObject.HulkRobot.prototype.constructor = de.worldObject.HulkRobot;
de.worldObject.HulkRobot.prototype.update = function() {
    var move;

    if(!this.isActive) {
        return true;
    }

    move = this.pattern.length > 0 ? new libjsca.Point(this.pattern[this.stepIndex].x, this.pattern[this.stepIndex].y) : de.worldObject.World.prototype.MOVE.STAY;
    if (this.world.isPossibleMove(this, move)) {
        this.world.startMove(this, move);
    }
    this.stepIndex = (this.stepIndex + 1) % this.pattern.length;
    return true;
};

de.worldObject.TowerRobot = function(point, world) {
    de.worldObject.Robot.call(this, point, world);
};

de.worldObject.TowerRobot.prototype = new de.worldObject.Robot(null, null);

de.worldObject.TowerRobot.prototype.constructor = de.worldObject.TowerRobot;

de.worldObject.TowerRobot.prototype.update = function() {
    var move;
    if(!this.isActive) {
        return;
    }
    move = this.world.player.moveRequest.clone();
    move.multiply(-1);
    this.world.startMove(this, move);
    return true;
};

de.worldObject.InGameObjectList = function(world) {
    this.list = [];
    this.world = world;
};

de.worldObject.InGameObjectList.prototype.TYPES = [
    "Door", "Wall", "Switch", "BounceRobot", "TargetRobot", "TowerRobot", "Hole", "Goal", "Box", "Player", "HulkRobot", "Button", "FilledHole", "Rainbow"
];

de.worldObject.InGameObjectList.prototype.get = function(index) {
    return this.list[index];
};

/**
 *
 * @param objectBlueprint
 *
 *
 */
de.worldObject.InGameObjectList.prototype.addObject = function(objectBlueprint) {
    var position, inGameObject, initialDirection;

    if(this.TYPES.indexOf(objectBlueprint.type) === -1) {
        throw new Error("type not recognised: " + objectBlueprint.type);
    }

    position = new libjsca.Point(objectBlueprint.x, objectBlueprint.y);
    switch(objectBlueprint.type) {
        case "TargetRobot":
            inGameObject = new de.worldObject.TargetRobot(position, this.world);
            break;
        case "BounceRobot":
            initialDirection = typeof(objectBlueprint.initialDirection) === "object" ? new libjsca.Point(objectBlueprint.initialDirection.x, objectBlueprint.initialDirection.y) : new libjsca.Point(0, 0);
            inGameObject = new de.worldObject.BounceRobot(position, this.world, initialDirection);
            break;
        case "Goal":
            inGameObject = new de.worldObject.Goal(position, this.world);
            break;
        case "Wall":
            inGameObject = new de.worldObject.Wall(position, this.world);
            break;
        case "Box":
            inGameObject = new de.worldObject.Box(position, this.world);
            break;
        case "Hole":
            inGameObject = new de.worldObject.Hole(position, this.world);
            break;
        case "FilledHole":
            inGameObject = new de.worldObject.FilledHole(position, this.world);
            break;
        case "Switch":
            inGameObject = new de.worldObject.Switch(position, this.world, objectBlueprint.isActiveFromStart);
            break;
        case "Door":
            inGameObject = new de.worldObject.Door(position, this.world);
            break;
        case "TowerRobot":
            inGameObject = new de.worldObject.TowerRobot(position, this.world);
            break;
        case "HulkRobot":
            inGameObject = new de.worldObject.HulkRobot(position, this.world, objectBlueprint.pattern);
            break;
        case "Button":
            inGameObject = new de.worldObject.Button(position, this.world);
            break;
        case "Rainbow":
            inGameObject = new de.worldObject.Rainbow(position, this.world);
            break;
        default:
            throw new Error("this.init(): unrecognised object of type " + objectBlueprint.type);
    }

    this.list.push(inGameObject);

};

de.worldObject.InGameObjectList.prototype.push = function(inGameObject) {
    if(inGameObject instanceof de.worldObject.Player) {
        this.player = inGameObject;
    }
    this.list.push(inGameObject);
};

de.worldObject.InGameObjectList.prototype.getFirstOfType = function(type) {
    return this.list.filter(function(inGameObject) {
      return inGameObject instanceof type;
  })[0];
};

de.worldObject.InGameObjectList.prototype.update = function() {
    this.list.forEach(function(element) {
        element.update();
    });
};

/**
 * @param {libjsca.Point} point
 * @return {de.worldObject.InGameObjectList}
 */
de.worldObject.InGameObjectList.prototype.getInGameObjectsAt = function(point) {
    var i, element, inGameObjectList;
    inGameObjectList = new de.worldObject.InGameObjectList(this.world);
    for(i = 0; i < this.list.length; i += 1) {
        element = this.list[i];
        if(element.point.isEqualTo(point)) {
            inGameObjectList.push(element);
        }
    }
    return inGameObjectList;
};

de.worldObject.InGameObjectList.prototype.clean = function() {
    this.list = this.list.filter(function(element) {
        if(element.isRemovable) {
            return element.isActive;
        }
        return true;
    });
};

de.worldObject.InGameObjectList.prototype.has = function(objectType) {
    return this.list.some(function(element) {
        return element instanceof objectType;
    });
};

de.worldObject.InGameObjectList.prototype.count = function(objectType) {
    return this.list.filter(function(element) {
        return element instanceof objectType;
    }).length;
};



/**
 *
 */
de.worldObject.InGameObjectList.prototype.filter = function(objectType) {
    var inGameObjectList;
    inGameObjectList = new de.worldObject.InGameObjectList(this.world);

    inGameObjectList.list = this.list.filter(function(element) {
        return element instanceof objectType;
    });

    return inGameObjectList;
};

// Sort by coordinates for robots
// Y
// if same Y sort on X
// player always fírst
// buttons last
de.worldObject.InGameObjectList.prototype.sort = function() {
    this.list.sort(function(a, b) {
        if(a instanceof de.worldObject.Player) {
            return -1;
        }
        if(b instanceof de.worldObject.Player) {
            return 1;
        }

        if(a instanceof de.worldObject.Button && b instanceof de.worldObject.Button) {
            return 0;
        }
        if(a instanceof de.worldObject.Button && !(b instanceof de.worldObject.Button)) {
            return 1;
        }
        if(!(a instanceof de.worldObject.Button) && b instanceof de.worldObject.Button) {
            return -1;
        }

        if(a.point.y < b.point.y) {
            return -1;
        }
        if(a.point.y > b.point.y) {
            return 1;
        }
        if(a.point.y === b.point.y) {
            return a.point.x - b.point.x;
        }
    });
};

