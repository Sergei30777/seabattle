function runGame(startImmediatly) {
    var game = new SeeBattle("gameArea");
    game.run();

    // fallback для htmlpreview
    if (startImmediatly) {
      game.startNewGame();
    }
  }
 
 if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
        if (typeof this !== 'function') {
            
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        let aArgs   = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP    = function() {},
            fBound  = function() {
                return fToBind.apply(this instanceof fNOP && oThis
                    ? this
                    : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        
        define(['sea-battle'], factory);
    } else {
        
        root.SeeBattle = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    /**
     * @constructor
     * @param {string} gameAreaId
     * @return {SeeBattle}
     */
    function SeeBattle(gameAreaId){
        this.gameFieldBorderX = ['A','B','C','D','E','F','G','H','I','J'];
        this.gameFieldBorderY = ['1','2','3','4','5','6','7','8','9','10'];
        this.gameArea = document.getElementById(gameAreaId);
        this.gameArea.innerHTML = "";
        this.shipsConfiguration = [
            {maxShips: 1, pointCount: 4},
            {maxShips: 2, pointCount: 3},
            {maxShips: 3, pointCount: 2},
            {maxShips: 4, pointCount: 1}
        ];
        this.userName = null;
        this.pcName = null;
        this.pcDelay = 800;

        this._hitsForWin = 0;
        for(var i=0;i<this.shipsConfiguration.length;i++){
            this._hitsForWin = +this._hitsForWin + (this.shipsConfiguration[i].maxShips*this.shipsConfiguration[i].pointCount);
        }

        this._pcShipsMap = null;
        this._userShipsMap = null;
        this._gameStopped = false;

        this.CELL_WITH_SHIP = 1;
        this.CELL_EMPTY = 0;

        
        this.pcInfo = null;
        this.userInfo = null;
        this.toolbar = null;
        this.startGameButton = null;
        this.pcGameField = null;
        this.userGameField = null;
    }

    SeeBattle.prototype = {
        
        run: function(){
            this.createToolbar();
            this.createGameFields();
            this.createFooter();
        },
        createToolbar: function(){
            this.toolbar = document.createElement('div');
            this.toolbar.setAttribute('class', 'toolbar');
            this.gameArea.appendChild(this.toolbar);
        },
        createGameFields: function(){
            let pcGameArea = document.createElement('div');
            pcGameArea.setAttribute('class', 'pcGameArea');
            this.gameArea.appendChild(pcGameArea);

            let userGameArea = document.createElement('div');
            userGameArea.setAttribute('class', 'userGameArea');
            this.gameArea.appendChild(userGameArea);

            this.pcInfo = document.createElement('div');
            pcGameArea.appendChild(this.pcInfo);

            this.userInfo = document.createElement('div');
            userGameArea.appendChild(this.userInfo);

            this.pcGameField = document.createElement('div');
            this.pcGameField.setAttribute('class', 'gameField');
            this.userGameField = document.createElement('div');
            this.userGameField.setAttribute('class', 'gameField');
            pcGameArea.appendChild(this.pcGameField);
            userGameArea.appendChild(this.userGameField);
        },
        createFooter: function(){
            let footer = document.createElement('div');
            footer.setAttribute('class', 'footer');

            this.startGameButton = document.createElement('button');
            this.startGameButton.innerHTML = 'Начать игру';
            this.startGameButton.setAttribute('class', 'btn');
            this.startGameButton.onclick = function(){
                this.startNewGame();
            }.bind(this);
            footer.appendChild(this.startGameButton);

            this.gameArea.appendChild(footer);
        },
        startNewGame: function(){
            this.userName = this.userName || prompt('Ваше имя?', '');
            this.pcName = this.pcName || prompt('Имя противника', '');

            if(!this.userName || !this.pcName){
                alert('Неверно указали имя');
                return;
            }

            this.startGameButton.innerHTML = 'Начать заново...';
            this.pcInfo.innerHTML = this.pcName + ' (ваш противник)';
            this.userInfo.innerHTML = this.userName + ' (ваше поле)';

            this._pcShipsMap = this.generateRandomShipMap();
            this._userShipsMap = this.generateRandomShipMap();
            this._pcShotMap = this.generateShotMap();
            this._userHits = 0;
            this._pcHits = 0;
            this._blockHeight = null;
            this._gameStopped = false;
            this._pcGoing = false;

            this.drawGamePoints();
            this.updateToolbar();
        },

       
        drawGamePoints: function(){
            for(var yPoint=0;yPoint<this.gameFieldBorderY.length; yPoint++){
                for(var xPoint=0;xPoint<this.gameFieldBorderX.length; xPoint++){
                    var pcPointBlock = this.getOrCreatePointBlock(yPoint, xPoint);
                    pcPointBlock.onclick = function(e){
                        this.userFire(e);
                    }.bind(this);
                   

                    let userPointBlock = this.getOrCreatePointBlock(yPoint, xPoint, 'user');
                    if(this._userShipsMap[yPoint][xPoint] === this.CELL_WITH_SHIP){
                        userPointBlock.setAttribute('class', 'ship');
                    }
                }
            }
        },

        /**
         * 
         * @type {type}
         */
        _blockHeight: null,

        /**
         * 
         * @return {type}
         */
        getOrCreatePointBlock: function(yPoint, xPoint, type){
            let id = this.getPointBlockIdByCoords(yPoint, xPoint, type);
            let block = document.getElementById(id);
            if(block){
                block.innerHTML = '';
                block.setAttribute('class', '');
            }else{
                block = document.createElement('div');
                block.setAttribute('id', id);
                block.setAttribute('data-x', xPoint);
                block.setAttribute('data-y', yPoint);
                if(type && type === 'user'){
                    this.userGameField.appendChild(block);
                }else{
                    this.pcGameField.appendChild(block);
                }
            }
            block.style.width = (100 / this.gameFieldBorderY.length) + '%';
            if(!this._blockHeight){
                this._blockHeight = block.clientWidth;
            }
            block.style.height = this._blockHeight + 'px';
            block.style.lineHeight = this._blockHeight + 'px';
            block.style.fontSize = this._blockHeight + 'px';
            return block;
        },

        /**
         
         * @param {type} yPoint
         * @param {type} xPoint
         * @param {type} type
         * @return {String}
         */
        getPointBlockIdByCoords: function(yPoint, xPoint, type){
            if(type && type === 'user'){
                return 'user_x' + xPoint + '_y' + yPoint;
            }
            return 'pc_x' + xPoint + '_y' + yPoint;
        },

        /**
         
         * @return {Array|SeeBattle.prototype.generateShotMap.map}
         */
        generateShotMap: function(){
            let map = [];
            for(let yPoint=0;yPoint<this.gameFieldBorderY.length; yPoint++){
                for(let xPoint=0;xPoint<this.gameFieldBorderX.length; xPoint++){
                    map.push({y: yPoint, x: xPoint});
                }
            }
            return map;
        },

        /**
         
         * @return {Array}
         */
        generateRandomShipMap: function(){
            let map = [];
            
            for(let yPoint=-1;yPoint<(this.gameFieldBorderY.length+1); yPoint++){
                for(let xPoint=-1;xPoint<(this.gameFieldBorderX.length+1); xPoint++){
                    if(!map[yPoint]){
                        map[yPoint] = [];
                    }
                    map[yPoint][xPoint] = this.CELL_EMPTY;
                }
            }

          
            let shipsConfiguration = JSON.parse(JSON.stringify(this.shipsConfiguration));
            let allShipsPlaced = false;
            while(allShipsPlaced === false){
                let xPoint = this.getRandomInt(0, this.gameFieldBorderX.length);
                let yPoint = this.getRandomInt(0, this.gameFieldBorderY.length);
                if(this.isPointFree(map, xPoint, yPoint) === true){
                    if(this.canPutHorizontal(map, xPoint, yPoint, shipsConfiguration[0].pointCount, this.gameFieldBorderX.length)){
                        for(var i=0;i<shipsConfiguration[0].pointCount;i++){
                            map[yPoint][xPoint + i] = this.CELL_WITH_SHIP;
                        }
                    }else if(this.canPutVertical(map, xPoint, yPoint, shipsConfiguration[0].pointCount, this.gameFieldBorderY.length)){
                        for(var i=0;i<shipsConfiguration[0].pointCount;i++){
                            map[yPoint + i][xPoint] = this.CELL_WITH_SHIP;
                        }
                    }else{
                        continue;
                    }

                    
                    shipsConfiguration[0].maxShips--;
                    if(shipsConfiguration[0].maxShips < 1){
                        shipsConfiguration.splice(0, 1);
                    }
                    if(shipsConfiguration.length === 0){
                        allShipsPlaced = true;
                    }
                }
            }
            return map;
        },
        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        },

        /**
         
         * @param {type} map
         * @param {type} xPoint
         * @param {type} yPoint
         * @return {Boolean}
         */
        isPointFree: function(map, xPoint, yPoint){
            
            if(map[yPoint][xPoint] === this.CELL_EMPTY
                && map[yPoint-1][xPoint] === this.CELL_EMPTY
                && map[yPoint-1][xPoint+1] === this.CELL_EMPTY
                && map[yPoint][xPoint+1] === this.CELL_EMPTY
                && map[yPoint+1][xPoint+1] === this.CELL_EMPTY
                && map[yPoint+1][xPoint] === this.CELL_EMPTY
                && map[yPoint+1][xPoint-1] === this.CELL_EMPTY
                && map[yPoint][xPoint-1] === this.CELL_EMPTY
                && map[yPoint-1][xPoint-1] === this.CELL_EMPTY
            ){
                return true;
            }
            return false;
        },

        /**
         
         * @param {type} map
         * @param {type} xPoint
         * @param {type} yPoint
         * @param {type} shipLength
         * @param {type} coordLength
         * @return {Boolean}
         */
        canPutHorizontal: function(map, xPoint, yPoint, shipLength, coordLength){
            let freePoints = 0;
            for(var x=xPoint;x<coordLength;x++){
               
                if(map[yPoint][x] === this.CELL_EMPTY
                    && map[yPoint-1][x] === this.CELL_EMPTY
                    && map[yPoint-1][x+1] === this.CELL_EMPTY
                    && map[yPoint][x+1] === this.CELL_EMPTY
                    && map[yPoint+1][x+1] === this.CELL_EMPTY
                    && map[yPoint+1][x] === this.CELL_EMPTY
                ){
                    freePoints++;
                }else{
                    break;
                }
            }
            return freePoints >= shipLength;
        },

        /**
         
         * @param {type} map
         * @param {type} xPoint
         * @param {type} yPoint
         * @param {type} shipLength
         * @param {type} coordLength
         * @return {Boolean}
         */
        canPutVertical: function(map, xPoint, yPoint, shipLength, coordLength){
            let freePoints = 0;
            for(let y=yPoint;y<coordLength;y++){
                
                if(map[y][xPoint] === this.CELL_EMPTY
                    && map[y+1][xPoint] === this.CELL_EMPTY
                    && map[y+1][xPoint+1] === this.CELL_EMPTY
                    && map[y+1][xPoint] === this.CELL_EMPTY
                    && map[y][xPoint-1] === this.CELL_EMPTY
                    && map[y-1][xPoint-1] === this.CELL_EMPTY
                ){
                    freePoints++;
                }else{
                    break;
                }
            }
            return freePoints >= shipLength;
        },

        /**
         
         * @param {type} e
         */
        userFire: function(event){
            if(this.isGameStopped() || this.isPCGoing()){
                return;
            }
            let e = event || window.event;
            let firedEl = e.target || e.srcElement;
            let x = firedEl.getAttribute('data-x');
            let y = firedEl.getAttribute('data-y');
            if(this._pcShipsMap[y][x] === this.CELL_EMPTY){
                firedEl.innerHTML = this.getFireFailTemplate();
                this.prepareToPcFire();
            }else{
                firedEl.innerHTML = this.getFireSuccessTemplate();
                firedEl.setAttribute('class', 'ship');
                this._userHits++;
                this.updateToolbar();
                if(this._userHits >= this._hitsForWin){
                    this.stopGame();
                }
            }
            firedEl.onclick = null;
        },
        _pcGoing: false,
        isPCGoing: function(){
            return this._pcGoing;
        },

        prepareToPcFire: function(){
            this._pcGoing = true;
            this.updateToolbar();
            setTimeout(function(){
                this.pcFire();
            }.bind(this), this.pcDelay);
        },

        
        pcFire: function(){
            if(this.isGameStopped()){
                return;
            }
          
            let randomShotIndex = this.getRandomInt(0, this._pcShotMap.length);
            let randomShot = JSON.parse(JSON.stringify(this._pcShotMap[randomShotIndex]));
            
            this._pcShotMap.splice(randomShotIndex, 1);

            var firedEl = document.getElementById(this.getPointBlockIdByCoords(randomShot.y, randomShot.x, 'user'));
            if(this._userShipsMap[randomShot.y][randomShot.x] === this.CELL_EMPTY){
                firedEl.innerHTML = this.getFireFailTemplate();
            }else{
                firedEl.innerHTML = this.getFireSuccessTemplate();
                this._pcHits++;
                this.updateToolbar();
                if(this._pcHits >= this._hitsForWin){
                    this.stopGame();
                }else{
                    this.prepareToPcFire();
                }
            }
            this._pcGoing = false;
            this.updateToolbar();
        },
       
        stopGame: function(){
            this._gameStopped = true;
            this._pcGoing = false;
            this.startGameButton.innerHTML = 'Сыграть еще раз?';
            this.updateToolbar();
        },
        isGameStopped: function(){
            return this._gameStopped;
        },
        getFireSuccessTemplate: function(){
            return 'X';
        },
        getFireFailTemplate: function(){
            return '&#183;';
        },

      
        updateToolbar: function(){
            this.toolbar.innerHTML = 'Счет - ' + this._pcHits + ':' + this._userHits;
            if(this.isGameStopped()){
                if(this._userHits >= this._hitsForWin){
                    this.toolbar.innerHTML += ', вы победили';
                }else{
                    this.toolbar.innerHTML += ', победил ваш противник';
                }
            }else if(this.isPCGoing()){
                this.toolbar.innerHTML += ', ходит ваш противник';
            }else{
                this.toolbar.innerHTML += ', сейчас ваш ход';
            }
        },
    };

    return SeeBattle;
}));

