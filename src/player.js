const MidiPlayerJS = require('midi-player-js')
const Audio = require('./audio')
let _midiPlayer
let _audioPlayer

const setMidiPlayer = (player) => {
  _midiPlayer = player
}

const getPlayer = () => {
  return _midiPlayer
}

const setAudioPlayer  = (player) => {
  _audioPlayer = player
}

const loadMidiPlayer = (file, onLoaded) => {
  setMidiPlayer(new MidiPlayerJS.Player())

  if (onLoaded) {
    _midiPlayer.on('fileLoaded', onLoaded)
  }

  _midiPlayer.loadFile(file)
}

const isPlaying = () => _midiPlayer.isPlaying()

const stop = () => {
  _midiPlayer.stop()
  _audioPlayer.stop()
  player.setPlayerPosition(1)
}

const setPlayerPosition = (measure) => {
  const tick = (measure - 1) * (_midiPlayer.division * 4)
  const seconds = tick / _midiPlayer.division / _midiPlayer.tempo * 60
  _midiPlayer.skipToTick(tick)
  _audioPlayer.goTo(seconds)
}

const player = {
  getPlayer,
  loadMidiPlayer,
  isPlaying,
  stop,
  setMidiPlayer,
  setAudioPlayer,
  setPlayerPosition
}

module.exports = {
  getPlayer,
  loadMidiPlayer,
  player,
}
