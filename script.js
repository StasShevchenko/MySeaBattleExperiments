import * as prepareGameFunctions from "./prepare_game_functions.js";
let stompClient = null;
let currentPlayerName;
let currentPlayerId;
let isIdReceived = false;
//Определяет, начата ли игра
let isGameStarted = false;
//Определяет, начато ли сражение
let isFightStarted = false;
//Id игрового оппонента
let enemyId;
//Определяет расставлены ли корабли
let isShipsPlaced = false;
//Определяет получено ли вражеское поле
let isEnemyFieldReceived = false;
//Определяет ваш ли сейчас ход
let isMyMove = false;
//
let enemyLifeCount = 20;

const url = "http://192.168.109.228:8080";

const startForm = document.getElementById("startForm");
const playersListForm = document.getElementById("playersListForm");
const mainGameForm = document.getElementById("mainGameForm");
const playersList = document.getElementById("playersList");

//////////////////////////////////////////////////////////////////////////////////

//
//Блок входа в игру
//
const enterNameButton = document.getElementById("enterNameButton");
const enterNameTextField = document.getElementById("enterNameTextField");
const welcomeHeader = document.getElementById("welcomeHeader");

enterNameButton.addEventListener("click", function () {
  if (enterNameTextField.value != "") {
    currentPlayerName = enterNameTextField.value.trim();
    welcomeHeader.innerHTML = "Добро пожаловать " + currentPlayerName + " !";
    const socket = new SockJS(url + "/seabattle");
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnectSuccess);
  }
});

//
//Конец блока входа в игру
//

//////////////////////////////////////////////////////////////////////////////////

//
//Блок работы со списком игроков
//

const invitePopUp = document.getElementById("invitePopUpContainer");
const waitPopUp = document.getElementById("waitPopUpContainer");
const acceptInvitationButton = document.getElementById(
  "acceptInvitationButton"
);
const rejectInvitationButton = document.getElementById(
  "rejectInvitationButton"
);
const invitationHeader = document.getElementById("invitationHeader");
const rejectSendedInvitationButton = document.getElementById(
  "rejectSendedInvitationButton"
);

//
//Конец блока работы со списком игроков
//

//////////////////////////////////////////////////////////////////////////////////

//
//Блок игровой инициализации
//

//Матрица значений состояния клеток поля и её инициализация
//0-пустая клетка, 1 - клетка с кораблем, 2 - клетка недоступная для выстрела, 3 - клетка с подбитым кораблем
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
      receiverId: enemyId,
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
//
//Конец блока игровой инициализации
//

//////////////////////////////////////////////////////////////////////////////////

function onPlayersReceive(payload) {
  const players = JSON.parse(payload.body);
  while (playersList.firstChild) {
    playersList.removeChild(playersList.lastChild);
  }
  for (let player of players) {
    if (player.login.trim() != currentPlayerName) {
      const playerItem = document.createElement("li");
      playerItem.appendChild(document.createTextNode(player.login));
      const playerInviteButton = document.createElement("button");
      playerInviteButton.textContent = "Бросить вызов!";
      playerInviteButton.style.marginLeft = "10px";
      playerInviteButton.addEventListener("click", function () {
        sendInviteToPlayer(player);
      });
      playerItem.appendChild(playerInviteButton);
      playersList.appendChild(playerItem);
    }
  }
  if (!isIdReceived) {
    for (let i = players.length - 1; i >= 0 && !isIdReceived; i--) {
      if (players[i].login.trim() == currentPlayerName) {
        isIdReceived = true;
        currentPlayerId = players[i].id.trim();
        subscribeToPrivateMessages();
        subscribeToGame();
      }
    }
  }
}

//Подписываемся на приватные сообщения. Обработка всех приходящих сообщения
function subscribeToPrivateMessages() {
  stompClient.subscribe(
    //Все сообщения отправленные на /private-message переправляются сервером в пути с конкретным id
    "/private/messages" + currentPlayerId.trim(),
    function (payload) {
      let message = JSON.parse(payload.body);
      //Если пришло приглашение
      if (message.message == "INVITE") {
        invitePopUp.style.display = "flex";
        invitationHeader.innerHTML =
          "Игрок " + message.senderName + " бросил вам вызов!";
        //Отказываемся от приглашения
        rejectInvitationButton.addEventListener("click", function () {
          invitePopUp.style.display = "none";

          stompClient.send(
            "/app/private-message",
            {},
            JSON.stringify(
              {
                message: "REJECT",
                receiverId: message.senderId,
                senderId: currentPlayerId,
                senderName: currentPlayerName,
              },
              { once: true }
            )
          );
        });
        //Принимаем приглашение и инициируем игру
        acceptInvitationButton.addEventListener(
          "click",
          function () {
            invitePopUp.style.display = "none";
            stompClient.send(
              "/app/init-game",
              {},
              JSON.stringify({
                firstPlayerId: message.senderId,
                secondPlayerId: currentPlayerId,
              })
            );
          },
          { once: true }
        );
      }
      //Если отправитель отменил свое приглашение
      if (message.message == "CANCEL_INVITATION") {
        invitePopUp.style.display = "none";
      }
      //Если получатель не принял приглашение
      if (message.message == "REJECT") {
        isMyMove = false;
        waitPopUp.style.display = "none";
      }
      if (message.message == "YOU_LOSE") {
        endGameMessage.innerHTML = "Все ваши корабли уничтожены! Вы проиграли!";
        endGameButton.addEventListener(
          "click",
          function () {
            resetGameField();
          },
          { once: true }
        );
        endGamePopUp.style.display = "flex";
      }

      if (message.message == "ENEMY_DISCONNECTED") {
        console.log("Противник отлетел!");
        endGameMessage.innerHTML =
          "Ваш противник отключился! Техническая победа!";
        endGameButton.addEventListener(
          "click",
          function () {
            resetGameField();
          },
          { once: true }
        );
        endGamePopUp.style.display = "flex";
      }
    }
  );
}

//Функция для отправки сообщения игроку
// и назначение кнопки отмены
function sendInviteToPlayer(player) {
  let message = "INVITE";
  let cancelMessage = "CANCEL_INVITATION";
  waitPopUp.style.display = "flex";
  isMyMove = true;
  //Отправка отмены приглашения
  rejectSendedInvitationButton.addEventListener(
    "click",
    function () {
      waitPopUp.style.display = "none";
      isMyMove = false;
      stompClient.send(
        "/app/private-message",
        {},
        JSON.stringify({
          message: cancelMessage,
          receiverId: player.id,
          senderId: currentPlayerId,
          senderName: currentPlayerName,
        })
      );
    },
    { once: true }
  );
  //Отправка приглашения
  stompClient.send(
    "/app/private-message",
    {},
    JSON.stringify({
      message: message,
      receiverId: player.id,
      senderId: currentPlayerId,
      senderName: currentPlayerName,
    })
  );
}

//Функция, необходимая для того, чтобы подписаться на события игры
function subscribeToGame() {
  stompClient.subscribe("/private/game" + currentPlayerId, function (payload) {
    onGameReceive(payload);
  });
}

function onGameReceive(payload) {
  if (!isGameStarted) {
    waitPopUp.style.display = "none";
    let game = JSON.parse(payload.body);
    if (game.firstPlayerId == currentPlayerId) {
      enemyId = game.secondPlayerId;
    } else {
      enemyId = game.firstPlayerId;
    }
    isGameStarted = true;
    playersListForm.style.display = "none";
    mainGameForm.style.display = "block";
  } else if (!isFightStarted) {
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
      userFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.DESTRUCTED;
      getGameFieldCell(x, y).style.background = "black";
    } else {
      userFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.RESTRICTED;
      getGameFieldCell(x, y).style.background = "pink";
      isMyMove = true;
      enemyReadyHeader.innerHTML = "Ваш ход!";
    }
  }
}

//Функция необходимая для начала боя
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

function onConnectSuccess() {
  stompClient.subscribe("/topic/players", function (payload) {
    onPlayersReceive(payload);
  });
  stompClient.send("/app/addplayer", {}, enterNameTextField.value.trim());
  startForm.style.display = "none";
  playersListForm.style.display = "block";
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

function getEnemyGameFieldCell(row, column) {
  return enemyGameField.children[row * 10 + column];
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
          receiverId: enemyId,
        })
      );
      checkWin();
    } else {
      enemyFieldMatrix[x][y] = prepareGameFunctions.GameFieldStates.RESTRICTED;
      getEnemyGameFieldCell(x, y).style.background = "pink";
      stompClient.send(
        "/app/send-move",
        {},
        JSON.stringify({
          x: x,
          y: y,
          receiverId: enemyId,
        })
      );
      isMyMove = false;
      enemyReadyHeader.innerHTML = "Ход противника!";
    }
  }
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
        receiverId: enemyId,
        senderId: currentPlayerId,
        senderName: currentPlayerName,
      })
    );
    endGameMessage.innerHTML = "Вы победили!";
    endGameButton.addEventListener("click", function () {
      resetGameField();
    });
    endGamePopUp.style.display = "flex";
  }
}

function resetGameField() {
  gameLegend.style.display = "none";
  prepareLegend.style.display = "block";
  enemyGameField.style.display = "none";
  userFieldControlPanel.style.display = "block";
  prepareGameButtonsPanel.style.display = "block";
  mainGameForm.style.display = "none";
  playersListForm.style.display = "block";
  endGamePopUp.style.display = "flex";
  endGamePopUp.style.display = "none";
  isGameStarted = false;
  isFightStarted = false;
  isShipsPlaced = false;
  isEnemyFieldReceived = false;
  enemyId = null;
  isMyMove = false;
  prepareGameFunctions.setIsFightStarted(isFightStarted);
  prepareGameFunctions.clearUserGameField();
  enemyLifeCount = 20;
  enemyReadyHeader.innerHTML = "Ваш противник расставляет корабли!";
  while (enemyGameField.firstChild) {
    enemyGameField.removeChild(enemyGameField.lastChild);
  }
}

window.addEventListener("beforeunload", function (e) {
  // Cancel the event
  e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
  // Chrome requires returnValue to be set
  e.returnValue = "";
});
