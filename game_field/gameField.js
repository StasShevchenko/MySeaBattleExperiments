import * as prepareGameFunctions from "./prepare_game_functions.js";

const url = "http://192.168.224.228:8080";

let enemyLifeCount = 20;

const soundController = new GameSound();

window.onload = function () {
  if (sessionStorage.getItem("firstGamePageVisit") == "true") {
    window.location.href = "../player_menu/playerMenu.html";
  }
  sessionStorage.setItem("firstGamePageVisit", "true");
};

let myName = sessionStorage.getItem("playerName");

let stompClient = null;
const socket = new SockJS(url + "/seabattle");
stompClient = Stomp.over(socket);
stompClient.connect({}, onConnectionSuccess);

let isFightStarted = false;

let isShipsPlaced = false;

let isEnemyFieldReceived = false;

//Определяем мой ли сейчас ход
let isMyMove = false;
if (sessionStorage.getItem("isMyMove") == "true") {
  isMyMove = true;
}

let enemyName = sessionStorage.getItem("enemyName");

let userFieldMatrix = new Array(10);
for (let i = 0; i < userFieldMatrix.length; i++) {
  userFieldMatrix[i] = new Array(10);
}
for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    userFieldMatrix[i][j] = 0;
  }
}
let enemyFieldMatrix;

//Radio buttons для выбора размерности корабля
let shipSizeRadios = document.getElementsByName("ship");
let orientationRadios = document.getElementsByName("orientation");
let shipLabels = document.querySelectorAll(".ship-buttons-group p");
const enemyReadyHeader = document.getElementById("enemyReadyHeader");

const clearButton = document.getElementById("clearButton");
const readyButton = document.getElementById("readyButton");
const prepareLegend = document.getElementById("prepareLegend");
const gameLegend = document.getElementById("gameLegend");
const userFieldControlPanel = document.getElementById("userFieldControlPanel");
const prepareGameButtonsPanel = document.getElementById(
  "prepareGameButtonsPanel"
);
const endGamePopUp = document.getElementById("gameResultContainer");
const endGameMessage = document.getElementById("resultMessageHeader");
const endGameButton = document.getElementById("returnToGameListButton");

readyButton.disabled = true;
const userGameField = document.getElementById("user-game-field");
const enemyGameField = document.getElementById("enemyGameField");
prepareGameFunctions.setUserGameField(userGameField);
prepareGameFunctions.setShipLabels(shipLabels);
prepareGameFunctions.makeUserGameField(10, 10);
prepareGameFunctions.setUserFieldMatrix(userFieldMatrix);
//Присваимваем меткам radio button'ов актуальные значения
prepareGameFunctions.updateLabels(shipLabels);
prepareGameFunctions.setReadyButton(readyButton);
prepareGameFunctions.setIsFightStarted(isFightStarted);

clearButton.addEventListener("click", function () {
  prepareGameFunctions.removeShips();
  readyButton.disabled = true;
});

readyButton.addEventListener("click", function () {
  clearButton.disabled = true;
  readyButton.disabled = true;
  isShipsPlaced = true;
  startFight();
  stompClient.send(
    "/app/send-field",
    {},
    JSON.stringify({
      receiverName: enemyName,
      gameField: userFieldMatrix,
    })
  );
});

//Навешиваем слушателей для радиокнопок размерности корабля
for (let radio of shipSizeRadios) {
  //Переменные цикла надо локализовать, иначе в слушаетеле будет использоваться последнее значение переменной
  let currentRadio = radio;
  radio.addEventListener("change", function () {
    if (currentRadio.checked) {
      prepareGameFunctions.changeCurrentShipSize(currentRadio.value);
    }
  });
}

//Навешиваем слушателей для радиокнопок ориентации корабля
for (let radio of orientationRadios) {
  let currentRadio = radio;
  radio.addEventListener("change", function () {
    if (currentRadio.checked) {
      prepareGameFunctions.changeCurrentOrientation(currentRadio.value);
    }
  });
}

function onConnectionSuccess() {
  stompClient.send(
    "/app/addplayer",
    {},
    JSON.stringify({ login: myName, status: "playing" })
  );
  subscribeToGame();
  subscribeToPrivateMessages();
}

function subscribeToGame() {
  stompClient.subscribe("/private/game" + myName, function (payload) {
    onGameReceive(payload);
  });
}

function subscribeToPrivateMessages() {
  stompClient.subscribe("/private/messages" + myName, function (payload) {
    onPrivateMessageReceive(payload);
  });
}

function onGameReceive(payload) {
  if (!isFightStarted) {
    let enemyField = JSON.parse(payload.body).gameField;
    enemyFieldMatrix = enemyField;
    enemyReadyHeader.innerHTML = "Ваш противник расставил корабли!";
    isEnemyFieldReceived = true;
    startFight();
  } else {
    let move = JSON.parse(payload.body);
    let x = parseInt(move.x);
    let y = parseInt(move.y);
    if (userFieldMatrix[x][y] == prepareGameFunctions.GameFieldStates.PLACED) {
      soundController.playDamageSound();
      userFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.DESTRUCTED;
      getGameFieldCell(x, y).style.background = "black";
    } else {
      soundController.playEnemyMissSound();
      userFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.RESTRICTED;
      getGameFieldCell(x, y).style.background = "pink";
      isMyMove = true;
      enemyReadyHeader.innerHTML = "Ваш ход!";
    }
  }
}

function startFight() {
  if (isEnemyFieldReceived && isShipsPlaced) {
    prepareLegend.style.display = "none";
    gameLegend.style.display = "flex";
    userFieldControlPanel.style.display = "none";
    prepareGameButtonsPanel.style.display = "none";
    if (isMyMove) enemyReadyHeader.innerHTML = "Ваш ход!";
    else enemyReadyHeader.innerHTML = "Ход противника!";
    enemyGameField.style.display = "grid";
    makeEnemyGameField();
    isFightStarted = true;
    prepareGameFunctions.setIsFightStarted(isFightStarted);
  }
}

function makeEnemyGameField() {
  enemyGameField.style.setProperty("--grid-rows", 10);
  enemyGameField.style.setProperty("--grid-cols", 10);
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      let cell = document.createElement("div");
      let x = i;
      let y = j;
      cell.addEventListener("click", function () {
        onEnemyCellClick(x, y);
      });
      enemyGameField.appendChild(cell).className = "grid-item";
    }
  }
}

function onEnemyCellClick(x, y) {
  if (
    isMyMove &&
    enemyFieldMatrix[x][y] != prepareGameFunctions.GameFieldStates.RESTRICTED &&
    enemyFieldMatrix[x][y] != prepareGameFunctions.GameFieldStates.DESTRUCTED
  ) {
    if (enemyFieldMatrix[x][y] == prepareGameFunctions.GameFieldStates.PLACED) {
      enemyFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.DESTRUCTED;
      getEnemyGameFieldCell(x, y).style.background = "black";
      enemyLifeCount--;
      stompClient.send(
        "/app/send-move",
        {},
        JSON.stringify({
          x: x,
          y: y,
          receiverName: enemyName,
        })
      );
      soundController.playRandomAttackSound();
      checkWin();
    } else {
      soundController.playRandomMissSound();
      enemyFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.RESTRICTED;
      getEnemyGameFieldCell(x, y).style.background = "pink";
      stompClient.send(
        "/app/send-move",
        {},
        JSON.stringify({
          x: x,
          y: y,
          receiverName: enemyName,
        })
      );
      isMyMove = false;
      enemyReadyHeader.innerHTML = "Ход противника!";
    }
  }
}

function getEnemyGameFieldCell(row, column) {
  return enemyGameField.children[row * 10 + column];
}

function getGameFieldCell(row, column) {
  return userGameField.children[row * 10 + column];
}

function checkWin() {
  if (enemyLifeCount == 0) {
    stompClient.send(
      "/app/private-message",
      {},
      JSON.stringify({
        message: "YOU_LOSE",
        receiverName: enemyName,
        senderName: myName,
      })
    );
    endGameMessage.innerHTML = "Вы победили!";
    endGameButton.addEventListener("click", function () {
      window.location.href = "../player_menu/playerMenu.html";
    });
    endGamePopUp.style.display = "flex";
  }
}

function onPrivateMessageReceive(payload) {
  let message = JSON.parse(payload.body);
  if (message.message == "YOU_LOSE") {
    endGameMessage.innerHTML = "Все ваши корабли уничтожены! Вы проиграли!";
    endGameButton.addEventListener(
      "click",
      function () {
        window.location.href = "../player_menu/playerMenu.html";
      },
      { once: true }
    );
    endGamePopUp.style.display = "flex";
  }

  if (message.message == "ENEMY_DISCONNECTED") {
    console.log("Противник отлетел!");
    endGameMessage.innerHTML = "Ваш противник отключился! Техническая победа!";
    endGameButton.addEventListener(
      "click",
      function () {
        window.location.href = "../player_menu/playerMenu.html";
      },
      { once: true }
    );
    endGamePopUp.style.display = "flex";
  }
}
