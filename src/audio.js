const { Howl } = require('howler')
const { getProject } = require('./project')
const {player} = require('./player')
let _player

let getPlayer = () => {
  return _player
}

const goTo = (second) => _player.seek(second)
const stop = () => _player.stop();

const AudioPlayer = {
  goTo,
  stop
}

const load = (file) => {
  _player = new Howl({
    src: [file]
  })

  player.setAudioPlayer(AudioPlayer)
}

let Project = getProject()

if (Project.audioFile) {
  load(Project.audioFile)
}

module.exports = {
  load,
  getPlayer,
}
