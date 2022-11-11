class GameSound {
  constructor() {}

  playRandomAttackSound() {
    this.#currentAttackAudio.pause();
    this.#currentAttackAudio.currentTime = 0;
    this.#currentAttackAudio = this.#attackSounds.random();
    this.#currentAttackAudio.play();
  }

  playDamageSound() {
    this.#damageSound.currentTime = 0;
    this.#damageSound.play();
  }


  playEnemyMissSound(){
    this.#missSound.currentTime = 0;
    this.#missSound.play();
  }

  


  playRandomMissSound() {
    this.#currentMissAudio.pause();
    this.#currentMissAudio.currentTime = 0;
    this.#currentMissAudio = this.#missSounds.random();
    this.#currentMissAudio.play();
  }

  #damageSound = new Audio("../audio/bear_cry_cut.mp3");

  #missSound = new Audio("../audio/miss_sound.mp3");
  


  #attackSounds = [
    new Audio("../audio/probitie1.mp3"),
    new Audio("../audio/1.mp3"),
  ];

  #missSounds = [
    new Audio("../audio/livsi1.mp3"),
    new Audio("../audio/livsi2.mp3"),
    new Audio("../audio/livsi3.mp3")
  ]

  #currentAttackAudio = new Audio("../audio/probitie1.mp3");

  #currentMissAudio = new Audio("../audio/livsi1.mp3");
}

Array.prototype.random = function () {
  return this[Math.floor(Math.random() * this.length)];
};
