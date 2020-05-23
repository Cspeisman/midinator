const {player} = require('../src/player');

// replaces setImmediate with mock
jest.useFakeTimers()

describe('player', () => {
  describe('play', () => {
    it('should call the midi and audio play function and animator', function () {
      const play = jest.fn()
      const animate = jest.fn()
      player.setAudioPlayer({play})
      player.setMidiPlayer({play})
      player.play()

      //invokes animate on the event loop set my setImmediate
      jest.runAllTimers();

      expect(play).toHaveBeenCalledTimes(2)
    });
  });

  describe('isPlaying', () => {
    it('should return if player is playing or not', function () {
      player.setMidiPlayer({isPlaying: () => true})
      expect(player.isPlaying()).toBeTruthy()
      player.setMidiPlayer({isPlaying: () => false})
      expect(player.isPlaying()).toBeFalsy()
    });
  })

  describe('stop', () => {
    it('should stop the midi and audio player and set player position', function () {
      const stop = jest.fn()
      let dummy = () => {
      }
      player.setAudioPlayer({
        stop,
        goTo: dummy
      })
      player.setMidiPlayer({
        stop,
        skipToTick: dummy
      })
      const playerPositionSpy = jest.spyOn(player, 'setPlayerPosition')
      player.stop()
      expect(stop).toBeCalledTimes(2)
      expect(playerPositionSpy).toHaveBeenCalled()
    });
  });

  describe('setPosition', function () {
    it('should sets the player position to beginning of bar', () => {
      const MidiPlayerFake = {
        division: 480,
        skipToTick: jest.fn(),
        tempo: 120
      }
      player.setMidiPlayer(MidiPlayerFake)
      player.setPlayerPosition(1)
      expect(MidiPlayerFake.skipToTick).toBeCalledWith(0);

      player.setPlayerPosition(4)
      expect(MidiPlayerFake.skipToTick).toBeCalledWith(5760);
    });

    it('should set audio player to the first second of the bar', function () {
      const MidiPlayerFake = {
        division: 480,
        skipToTick: jest.fn(),
        tempo: 120
      }
      const AudioPlayerFake = {
        goTo: jest.fn()
      }
      player.setMidiPlayer(MidiPlayerFake)
      player.setAudioPlayer(AudioPlayerFake)
      player.setPlayerPosition(1)
      expect(AudioPlayerFake.goTo).toBeCalledWith(0)
    });
  });
});