const MidiPlayer = require('midi-player-js')
const Audio = require('./audio')
let Player

const setPlayer = (player) => {
  Player = player
}

const getPlayer = () => {
  return Player
}

const loadMidiPlayer = (file, onLoaded) => {
  setPlayer(new MidiPlayer.Player())

  if (onLoaded) {
    Player.on('fileLoaded', onLoaded)
  }

  Player.loadFile(file)
}

const isPlaying = () => Player.isPlaying()

const stop = (setPosition) => {
  Player.stop();
  Audio.getPlayer().stop();
  setPosition()
}

const player = {
  getPlayer,
  loadMidiPlayer,
  isPlaying,
  stop,
  setPlayer
}

module.exports = {
  getPlayer,
  loadMidiPlayer,
  player,
}
