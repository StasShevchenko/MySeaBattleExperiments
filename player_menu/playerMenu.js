let stompClient = null;
let currentPlayerName;

const url = "http://192.168.109.228:8080";

sessionStorage.setItem("firstGamePageVisit", "false");



const playersListForm = document.getElementById("playersListForm");
const playersList = document.getElementById("playersList");
const gamesList = document.getElementById("gamesList");
const welcomeHeader = document.getElementById("welcomeHeader");

currentPlayerName = sessionStorage.getItem("playerName");
welcomeHeader.innerHTML = "Добро пожаловать " + currentPlayerName + " !";
const socket = new SockJS(url + "/seabattle");
stompClient = Stomp.over(socket);
stompClient.connect({}, onConnectSuccess);

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
  
}

function onGameInfoReceive(payload) {
  const games = JSON.parse(payload.body);
  while (gamesList.firstChild) {
    gamesList.removeChild(gamesList.lastChild);
  }
  for (let game of games) {
    const gameItem = document.createElement("li");
    let winnerText = document.createElement("span");
    winnerText.innerHTML = "Победитель: " + game.winner;
    winnerText.style.color = "green";
    gameItem.appendChild(winnerText);
    let loserText = document.createElement("span");
    loserText.innerHTML = "Проигравший: " + game.loser;
    loserText.style.color = "red";
    let dateText = document.createElement("span");
    dateText.innerHTML = game.date;
    gameItem.appendChild(winnerText);
    gameItem.appendChild(loserText);
    gameItem.appendChild(dateText);
    gamesList.appendChild(gameItem);
  }
}

//Подписываемся на приватные сообщения. Обработка всех приходящих сообщения
function subscribeToPrivateMessages() {
  stompClient.subscribe(
    "/private/messages" + currentPlayerName,
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
                receiverName: message.senderName,
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
            sessionStorage.setItem("enemyName", message.senderName);
            sessionStorage.setItem("isMyMove", "false");

            invitePopUp.style.display = "none";

            stompClient.send(
              "/app/private-message",
              {},
              JSON.stringify({
                message: "ACCEPT",
                receiverName: message.senderName,
                senderName: currentPlayerName,
              })
            );
            window.location.href = "../game_field/gameField.html";
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
        waitPopUp.style.display = "none";
      }

      if (message.message == "ACCEPT") {
        waitPopUp.style.display = "none";
        sessionStorage.setItem("isMyMove", "true");
        sessionStorage.setItem("enemyName", message.senderName);
        stompClient.send(
          "/app/init-game",
          {},
          JSON.stringify({
            firstPlayerName: currentPlayerName,
            secondPlayerName: message.senderName,
          })
        );
        window.location.href = "../game_field/gameField.html";
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
  rejectSendedInvitationButton.addEventListener(
    "click",
    function () {
      waitPopUp.style.display = "none";
      stompClient.send(
        "/app/private-message",
        {},
        JSON.stringify({
          message: cancelMessage,
          receiverName: player.login,
          senderName: currentPlayerName
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
      receiverName: player.login,
      senderName: currentPlayerName,
    })
  );
}

function onConnectSuccess() {
  subscribeToPrivateMessages();
  stompClient.subscribe("/topic/players", function (payload) {
    onPlayersReceive(payload);
  });
  stompClient.subscribe("/topic/games", function (payload) {
    onGameInfoReceive(payload);
  });
  stompClient.send(
    "/app/addplayer",
    {},
    JSON.stringify({ login: currentPlayerName, status: "waiting"})
  );
  playersListForm.style.display = "block";
}

// window.addEventListener("beforeunload", function (e) {
//   // Cancel the event
//   e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
//   // Chrome requires returnValue to be set
//   e.returnValue = "";
// });
