import * as prepareGameFunctions from './prepare_game_functions.js';
let stompClient = null;
let currentPlayerName;
let currentPlayerId;
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
    stompClient.connect(
      {},
      onConnectSuccess
    );
  }
});

//
//Конец блока входа в игру
//

//////////////////////////////////////////////////////////////////////////////////

//
//Блок игровой инициализации
//
//Radio buttons для выбора размерности корабля
let shipSizeRadios = document.getElementsByName("ship");
let orientationRadios = document.getElementsByName("orientation");
let shipLabels = document.querySelectorAll(".ship-buttons-group p");
const clearButton = document.getElementById("clearButton");
const readyButton = document.getElementById("readyButton");
readyButton.disabled = true;
const userGameField = document.getElementById("user-game-field");
prepareGameFunctions.setUserGameField(userGameField);
prepareGameFunctions.setShipLabels(shipLabels);
prepareGameFunctions.makeUserGameField(10, 10);
//Присваимваем меткам radio button'ов актуальные значения
prepareGameFunctions.updateLabels(shipLabels);

clearButton.addEventListener("click", function () {
  prepareGameFunctions.removeShips();
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
  while(playersList.firstChild){
    playersList.removeChild(playersList.lastChild);
  }
  for(let player of players){
    if(player.login.trim() != currentPlayerName){
      const playerItem = document.createElement("li");
      playerItem.appendChild(document.createTextNode(player.login));
      const playerInviteButton = document.createElement("button");
      playerInviteButton.textContent = "Бросить вызов!";
      playerInviteButton.style.marginLeft = "10px";
      playerInviteButton.addEventListener("click", function(){
        sendInviteToPlayer(player);
      })
      playerItem.appendChild(playerInviteButton);
      playersList.appendChild(playerItem); 
    } else {
      currentPlayerId = player.id;
      subscribeToPrivateMessages();
    }
  }
}

function subscribeToPrivateMessages(){
  stompClient.subscribe("/private/messages" + currentPlayerId.trim(), function(payload){
    console.log("receved value!!!");
    console.log("I've received invite: " + payload);
  })
}

function sendInviteToPlayer(player){
  let message = "Hello man";
  stompClient.send(
    "/app/private-message",
    {},
    JSON.stringify({message:message, receiverId: player.id})
  )
}

function onConnectSuccess(){
  stompClient.subscribe("/topic/players", function (payload) {
    onPlayersReceive(payload);
  });
  stompClient.send(
    "/app/addplayer",
    {},
    enterNameTextField.value.trim()
  );
  startForm.style.display = "none";
  playersListForm.style.display = "block";
}
