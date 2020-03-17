const {player} = require('../src/player');

describe('player', function () {
    const PlayerFake = {
        isPlaying: () => true
    }

    it('should return if player is playing or not', function () {
        PlayerFake.isPlaying = () => false;
        player.setPlayer(PlayerFake);
        expect(player.isPlaying()).toBeFalsy()
    });
});