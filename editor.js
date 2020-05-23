const fs = require('fs')
const leftpad = require('leftpad')
const Frame = require('canvas-to-buffer')
const rimraf = require('rimraf')
const ffmpeg = require('fluent-ffmpeg')
const jsonfile = require('jsonfile')
const userPrompt = require('electron-osx-prompt')
const {dialog} = require('electron').remote
const ipc = require('electron').ipcRenderer

const config = require('./config')
let Programs = require('./src/programs')
const {renderApp} = require('./src/app')
const {renderColumns, getColumns} = require('./src/columns')
const PlayerMod = require('./src/player')
const {getProject, setProject} = require('./src/project')
let Audio = require('./src/audio')

const {getPlayer, loadMidiPlayer} = PlayerMod;
const playerMod = PlayerMod.player;
const animator = require('./src/animator');
animator.setPrograms(Programs);
require('./src/shortcuts')

const columnWidth = config.videoWidth / config.totalColumns
const progressElem = document.getElementById('progress')
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
canvas.width = config.videoWidth
canvas.height = config.videoHeight

const init = () => {
  const Project = getProject()
  if (Project.midiFile) {
    console.log(`loading midiFile: ${Project.midiFile}`)

    loadMidiPlayer(Project.midiFile, () => {
      const player = getPlayer()
      const midiFileEvents = player.getEvents()[0]

      const merged = {}

      Project.midiEvents.forEach((midiEvent) => {
        if (midiEvent.name !== 'Note on') return

        const hasProgram = (e) => e.programs && e.programs.length

        if (!merged[midiEvent.tick]) {
          merged[midiEvent.tick] = midiEvent
        } else if (!hasProgram(merged[midiEvent.tick]) && hasProgram(midiEvent.programs)) {
          merged[midiEvent.tick] = midiEvent
        }
      })

      midiFileEvents.forEach((midiEvent) => {
        if (midiEvent.name !== 'Note on') return

        if (!merged[midiEvent.tick]) {
          merged[midiEvent.tick] = midiEvent
        }
      })

      Project.midiEvents = Object.values(merged).sort((a, b) => a.tick - b.tick)

      if (Project.tempo) {
        const player = getPlayer()
        player.setTempo(Project.tempo)
      }
      renderApp()
    })
  }

  if (Project.programs.length) {
    Programs.load(Project.programs)
  }

  if (!fs.existsSync('./frames')) {
    fs.mkdirSync('./frames')
  }

  if (!fs.existsSync('./tmp')) {
    fs.mkdirSync('./tmp')
  }
}

const loadMidiFile = () => {
  dialog.showOpenDialog({
    title: 'Load Midi File',
    message: 'select a .mid file',
    properties: ['openFile'],
    filters: [
      {name: 'Midi', extensions: ['mid', 'midi']}
    ]
  }).then(function ({filePaths}) {
    if (filePaths !== undefined) {
      const Project = getProject()
      Project.midiFile = filePaths[0]
      loadMidiPlayer(Project.midiFile)
      const player = getPlayer()
      Project.midiEvents = player.getEvents()[0]
      renderApp()
    }
  })
}

const play = () => {
  const player = playerMod.getPlayer()
  if (!player) return;

  if (playerMod.isPlaying()) {
    playerMod.stop()
    const elem = document.getElementById('current-position')
    if (elem && elem.parentNode) elem.parentNode.removeChild(elem)
    document.querySelector('#play').innerHTML = 'Play'
    return
  }

  let currentTick = 0
  const currentPosition = document.createElement('div')
  currentPosition.id = 'current-position'

  const animate = () => {
    if (currentPosition.parentNode) currentPosition.parentNode.removeChild(currentPosition)
    const measureLength = player.division * 4
    const currentMeasure = Math.ceil(currentTick / measureLength)
    const parent = document.querySelector(`.measure:nth-child(${currentMeasure})`)
    const position = ((currentTick % measureLength) / measureLength) * 100
    currentPosition.setAttribute('style', `left: ${position}%;`)
    if (parent && player.isPlaying()) parent.appendChild(currentPosition)

    // reset canvas
    canvas.width = canvas.width

    const Project = getProject()
    animator.animate(Project, currentTick, ctx, renderColumns);

    let images = {}
    for (let i = 0; i < config.totalColumns; i++) {
      images[i] = ctx.getImageData(i * columnWidth, 0, columnWidth, canvas.height)
    }

    ipc.send('render', {images})
    ipc.send('video', {imageData: ctx.getImageData(0, 0, canvas.width, canvas.height)})

    if (playerMod.isPlaying()) setImmediate(animate)
  }

  player.on('playing', (tick) => currentTick = tick.tick)
  playerMod.play()

  document.querySelector('#play').innerHTML = 'Reset'
  setImmediate(animate)
}

const showExportDialog = () => {
  dialog.showSaveDialog({
    title: 'Save Video File',
    defaultPath: '~/Downloads/output',
    //message: 'select a .mid file',
    filters: [
      {name: 'Video', extensions: ['mp4']}
    ]
  }, function (file) {
    if (file) exportVideo(file)
  })
}

const exportVideo = (outputPath) => {
  console.log('clearing frames')
  rimraf.sync('tmp/*')

  let f = 0

  const renderFrame = () => {
    // reset canvas
    canvas.width = canvas.width
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const Project = getProject()
    for (let e = 0; e < Project.midiEvents.length; e++) {
      const midiEvent = Project.midiEvents[e]

      if (midiEvent.tick > f) continue
      if (midiEvent.name !== 'Note on') continue
      if (!midiEvent.programs.length) continue

      midiEvent.programs.forEach((program) => {
        const end = (program.params.length || 10) + midiEvent.tick
        if (f > end) return

        const delta = f - midiEvent.tick
        const cnvs = Programs.run(program.name, {
          canvasHeight: canvas.height,
          canvasWidth: canvas.width,
          delta,
          ...program.params
        })

        const columns = getColumns({delta, ...program.columnParams, ...program.params})
        if (!columns.length) return ctx.drawImage(cnvs, 0, 0)
        renderColumns({cnvs, ctx, columns})
      })
    }

    const frame = new Frame(canvas, {quality: 1, image: {types: ['png']}})
    fs.writeFileSync('tmp/' + leftpad(f, 5) + '.png', frame.toBuffer())

    const player = getPlayer()
    if (f < player.totalTicks) {
      const percent = `${Math.round(f / player.totalTicks * 100)}`

      f += 1
      if (progressElem.value != percent) {
        progressElem.value = parseInt(percent, 10)
        setTimeout(() => renderFrame(), 30)
      } else renderFrame()
    } else runFFmpeg(outputPath)
  }

  console.log('rendering frames')
  renderFrame()
}

const runFFmpeg = (outputPath) => {
  const player = getPlayer()
  console.log('running ffmpeg')
  //TODO: run ffmpeg generate video
  // ffmpeg -r 192 -i frames/%5d.png -c:v libx264 -r 30 -pix_fmt yuv420p mp4/chappell.mp4
  const inputFPS = 1000 / (60000 / (player.tempo * player.division))
  const cmd = ffmpeg('tmp/%5d.png')
    .inputFPS(inputFPS)
    .videoCodec('libx264')
    .outputOptions(['-pix_fmt yuv420p'])
    .outputFps(40)
    .output(outputPath)
    .on('progress', function (progress) {
      progressElem.value = Math.floor(progress.percent)
    })
    .on('end', function () {
      dialog.showMessageBox({type: 'info', message: 'Export Finished'})
      console.log('Finished processing')
    })
    .on('error', function (err, stdout, stderr) {
      dialog.showErrorBox(err.message, err)
      console.log('Cannot process video: ' + err.message)
    })
    .run()
}

const save = async () => {
  const resp = await dialog.showSaveDialog({
    title: 'Save Project File',
    defaultPath: '~/Downloads/light-project',
    filters: [
      {name: 'JSON', extensions: ['json']}
    ]
  })

  const {filePath} = resp
  if (filePath) {
    const Project = getProject()
    jsonfile.writeFileSync(filePath, Project)
    localStorage.setItem('projectFile', filePath)

    const projects = localStorage.getItem('projects') || []
    projects.push(filePath)
    localStorage.setItem('projects', projects)
  }
}

const loadJSON = () => {
  dialog.showOpenDialog({
    title: 'Load JSON File',
    message: 'select a .json file',
    properties: ['openFile'],
    filters: [
      {name: 'JSON', extensions: ['json']}
    ]
  }, (files) => {
    if (files !== undefined) {
      const file = files[0]
      const Project = setProject(jsonfile.readFileSync(file))
      loadMidiPlayer(Project.midiFile, () => {
        const player = getPlayer()
        player.tracks[0].events = Project.midiEvents
        player.events[0] = Project.midiEvents
        renderApp()
      })

      if (Project.programs.length) Programs.load(Project.programs)
    }
  })
}

const showProgramDialog = () => {
  dialog.showOpenDialog({
    title: 'Load MOV File',
    message: 'select a .mov file',
    properties: ['openFile'],
    filters: [
      {name: 'MOV', extensions: ['mov']}
    ]
  }, async (files) => {
    if (files !== undefined) {
      const file = files[0]
      const Project = getProject()
      Project.programs.push(file)
      Programs.load(Project.programs)
    }
  })
}

const loadAudio = async () => {
  const {filePaths} = await dialog.showOpenDialog({
    title: 'Load Audio File',
    message: 'select an audio file',
    properties: ['openFile'],
    filters: [
      {name: 'Audio', extensions: ['flac', 'mp3', 'wav']}
    ]
  })

  if (filePaths !== undefined) {
    const file = filePaths[0]
    const Project = getProject()
    Project.audioFile = file
    Audio.load(file)
  }
}

const setTempo = () => {
  userPrompt('Set Tempo', '120').then(input => {
    if (input) {
      const player = getPlayer()
      const tempo = parseInt(input, 10)
      const Project = getProject()
      Project.tempo = tempo
      player.setTempo(tempo)
      document.getElementById('tempo').innerHTML = `Tempo: ${player.tempo}`
    }
  }).catch(err => {
    console.log(err)
  })
}

document.querySelector('#play').addEventListener('click', play)
document.querySelector('#loadProgram').addEventListener('click', showProgramDialog)
document.querySelector('#loadAudio').addEventListener('click', loadAudio)
document.querySelector('#setTempo').addEventListener('click', setTempo)

ipc.on('new', loadMidiFile)
ipc.on('open', loadJSON)
ipc.on('export', showExportDialog)
ipc.on('save', save)

init()
