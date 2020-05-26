const config = require('../config')
const {getColumns} = require('./columns')
let _programs;

const _canvas = {
  width: config.videoWidth,
  height: config.videoHeight,
}

const animate = (Project, currentTick, ctx, renderColumns) => {
  for (let e = 0; e < Project.midiEvents.length; e++) {

    const midiEvent = Project.midiEvents[e]

    if (midiEvent.tick > currentTick) continue
    if (midiEvent.name !== 'Note on') continue
    if (!midiEvent.programs.length) continue

    let results = [];
    midiEvent.programs.forEach((program) => {
      const end = program.params.length + midiEvent.tick
      if (currentTick > end) return

      const delta = currentTick - midiEvent.tick
      const cnvs = _programs.run(program.name, {
        canvasHeight: _canvas.height,
        canvasWidth: _canvas.width,
        delta,
        ...program.params
      })

      const columns = getColumns({delta, ...program.columnParams, ...program.params})
      results.push({cnvs, results: renderColumns(columns)})
    })

    results.forEach(({cnvs, results}) => {
      results.forEach((result) => {
        ctx.drawImage(
          cnvs, result.sx, result.sy, result.columnWidth, result.columnHeight,
          result.dx, result.dy, result.columnWidth, result.columnHeight
        )
      });
    });
  }
}

const setPrograms = (Programs) => {
  _programs = Programs;
}

module.exports = {
  animate,
  setPrograms
}