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

const url = "http://localhost:8080";

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
readyButton.disabled = true;
const userGameField = document.getElementById("user-game-field");
prepareGameFunctions.setUserGameField(userGameField);
prepareGameFunctions.setShipLabels(shipLabels);
prepareGameFunctions.makeUserGameField(10, 10);
prepareGameFunctions.setUserFieldMatrix(userFieldMatrix);
//Присваимваем меткам radio button'ов актуальные значения
prepareGameFunctions.updateLabels(shipLabels);
prepareGameFunctions.setReadyButton(readyButton);

clearButton.addEventListener("click", function () {
  prepareGameFunctions.removeShips();
  readyButton.disabled = true;
});

readyButton.addEventListener("click", function(){
  clearButton.disabled = true;
  readyButton.disabled = true;
  isShipsPlaced = true;
  startFight();
  stompClient.send("/app/send-field",
  {},
  JSON.stringify({
    receiverId: enemyId,
    gameField: userFieldMatrix
  }))
})



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
        console.log("I've get id: " + players[i].id.trim());
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
        console.log(message.senderId);
        invitePopUp.style.display = "flex";
        invitationHeader.innerHTML =
          "Игрок " + message.senderName + " бросил вам вызов!";
        //Отказываемся от приглашения
        rejectInvitationButton.addEventListener("click", function () {
          invitePopUp.style.display = "none";
          console.log(message.senderId);
          stompClient.send(
            "/app/private-message",
            {},
            JSON.stringify({
              message: "REJECT",
              receiverId: message.senderId,
              senderId: currentPlayerId,
              senderName: currentPlayerName,
            })
          );
        });
        //Принимаем приглашение и инициируем игру
        acceptInvitationButton.addEventListener("click", function () {
          invitePopUp.style.display = "none";
          stompClient.send(
            "/app/init-game",
            {},
            JSON.stringify({
              firstPlayerId: message.senderId,
              secondPlayerId: currentPlayerId,
            })
          );
        });
      }
      //Если отправитель отменил свое приглашение
      if (message.message == "CANCEL_INVITATION") {
        invitePopUp.style.display = "none";
      }
      //Если получатель не принял приглашение
      if (message.message == "REJECT") {
        waitPopUp.style.display = "none";
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
  //Отправка отмены приглашения
  rejectSendedInvitationButton.addEventListener("click", function (player) {
    waitPopUp.style.display = "none";
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
  });
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
function subscribeToGame(){
  stompClient.subscribe("/private/game"+currentPlayerId, function(payload){
    onGameReceive(payload);
  })
}

function onGameReceive(payload){
  if(!isGameStarted){
    waitPopUp.style.display = "none";
    let game = JSON.parse(payload.body);
    if(game.firstPlayerId == currentPlayerId){
      enemyId = game.secondPlayerId;
    } else{
      enemyId = game.firstPlayerId;
    }
    isGameStarted = true;
    playersListForm.style.display = "none";
    mainGameForm.style.display = "block";
  } else
  if(!isFightStarted){
    let enemyField = JSON.parse(payload.body).gameField;
    enemyFieldMatrix = enemyField;
    enemyReadyHeader.innerHTML = "Ваш противник расставил корабли!";
    isEnemyFieldReceived = true;
    startFight();
  }
}


//Функция необходимая для начала боя
function startFight(){
  if(isEnemyFieldReceived && isShipsPlaced){
    console.log("I am ready for fight")
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
