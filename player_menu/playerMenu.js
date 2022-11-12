let stompClient = null;
let currentPlayerName;

const url = "http://192.168.109.228:8080";

const playerStatisticUrl = "http://192.168.109.228:8080/playerstatistic";

const overallStatisticUrl = "http://192.168.109.228:8080/overallstatistic";

sessionStorage.setItem("firstGamePageVisit", "false");

const playersListForm = document.getElementById("playersListForm");
const playersList = document.getElementById("playersList");
const playerStatisticList = document.getElementById("playerStatisticList");
const overallStatisticList = document.getElementById("overallStatisticList");
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
            JSON.stringify({
              message: "REJECT",
              receiverName: message.senderName,
              senderName: currentPlayerName,
            })
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
  stompClient.send(
    "/app/addplayer",
    {},
    JSON.stringify({ login: currentPlayerName, status: "waiting" })
  );
  playersListForm.style.display = "block";
  receivePlayerStatistic();
  receiveOverallStatistic();
}

const playerHttp = new XMLHttpRequest();

function receivePlayerStatistic() {
  playerHttp.open(
    "GET",
    playerStatisticUrl + "?" + "name=" + currentPlayerName
  );
  playerHttp.send();
}

playerHttp.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    let playerStatisticDataList = JSON.parse(playerHttp.responseText);
    while (playerStatisticList.firstChild) {
      playerStatisticList.removeChild(playerStatisticList.lastChild);
    }
    let i = 1;
    for (let gameInfo of playerStatisticDataList) {
      if (gameInfo.winner == currentPlayerName) {
        const playerStatisticItem = document.createElement("li");
        let head = document.createElement("span");
        head.innerHTML =
          i +
          ". Победа. " +
          "Противник: " +
          gameInfo.loser +
          " Дата: " +
          gameInfo.date;
        head.style.color = "green";
        playerStatisticItem.appendChild(head);
        playerStatisticList.appendChild(playerStatisticItem);
        i++;
      } else {
        const playerStatisticItem = document.createElement("li");
        let head = document.createElement("span");
        head.innerHTML =
          i +
          ". Поражение. " +
          "Противник: " +
          gameInfo.winner +
          " Дата: " +
          gameInfo.date;
        head.style.color = "red";
        playerStatisticItem.appendChild(head);
        playerStatisticList.appendChild(playerStatisticItem);
        i++;
      }
    }
  }
};

const overallHttp = new XMLHttpRequest();

function receiveOverallStatistic() {
  overallHttp.open("GET", overallStatisticUrl);
  overallHttp.send();
}

overallHttp.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    let overallStatisticDataList = JSON.parse(overallHttp.responseText);
    while (overallStatisticList.firstChild) {
      overallStatisticList.removeChild(playerStatisticList.lastChild);
    }
    let i = 1;
    for (let playerStatistic of overallStatisticDataList) {
      const overallStatisticItem = document.createElement("li");
      let head = document.createElement("span");
      head.innerHTML = i + ". " + playerStatistic.playerName;
      let winPercentageElement = document.createElement("span");
      winPercentageElement.innerHTML = "Процент побед: " + playerStatistic.winPercentage;
      let winCountElement = document.createElement("span");
      winCountElement.innerHTML = "Побед: " + playerStatistic.winCount;
      let loseCountElement = document.createElement("span");
      loseCountElement.innerHTML = "Поражений "+ playerStatistic.loseCount;

      // head.innerHTML =
      //   i +
      //   ". " +
      //   playerStatistic.playerName +
      //   "Процент побед: " +
      //   playerStatistic.winPercentage +
      //   " Побед: " +
      //   playerStatistic.winCount +
      //   " Поражений: " +
      //   playerStatistic.loseCount;
      if (playerStatistic.playerName == currentPlayerName) {
        head.style.color = "blue";
      }
      overallStatisticItem.appendChild(head);
      overallStatisticItem.appendChild(winPercentageElement);
      overallStatisticItem.appendChild(winCountElement);
      overallStatisticItem.appendChild(loseCountElement);
      overallStatisticList.appendChild(overallStatisticItem);
      i++;
    }
  }
};

// window.addEventListener("beforeunload", function (e) {
//   // Cancel the event
//   e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
//   // Chrome requires returnValue to be set
//   e.returnValue = "";
// });
