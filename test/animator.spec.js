const animator = require('../src/animator');

const ProjectFake = {
    midiEvents: [],
}

const ctx = {
    drawImage: jest.fn()
};

describe('animator', () => {
    describe('early exits ', () => {
        it("should exit early it tick is greater than currentTick", () => {
            ProjectFake.midiEvents.push({tick: 1});
            rendeColumns = jest.fn();
            const currentTick = 0
            animator.animate(ProjectFake, currentTick);
            expect(rendeColumns).not.toHaveBeenCalled();
        });

        it("should exit early if midi event name isn't 'Note on'", () => {
            ProjectFake.midiEvents.push({tick: 1, name: 'Note off'});
            rendeColumns = jest.fn();
            const currentTick = 1
            animator.animate(ProjectFake, currentTick, ctx, rendeColumns);
            expect(rendeColumns).not.toHaveBeenCalled();
        });

        it("should exit early if there are no midi event programs", () => {
            ProjectFake.midiEvents.push({
                tick: 1,
                name: 'Note on',
                programs: []
            });
            rendeColumns = jest.fn();
            const currentTick = 1
            animator.animate(ProjectFake, currentTick, ctx, rendeColumns);
            expect(rendeColumns).not.toHaveBeenCalled();
        });

        it("should exit early if current tick is greater than program length and tick", () => {
            ProjectFake.midiEvents.push({
                tick: 1,
                name: 'Note on',
                programs: [{params: {length: 1}}],
            });
            const currentTick = 3;
            const rendeColumns = jest.fn();
            animator.animate(ProjectFake, currentTick);
            expect(rendeColumns).not.toHaveBeenCalled();
        });
    });

    it("should run the correct program", () => {
        const Programs = {
            run: jest.fn(),
        }

        animator.setPrograms(Programs);
        ProjectFake.midiEvents.push({
            tick: 1,
            name: 'Note on',
            programs: [{name: 'test program', params: {length: 2, }}],
        });

        const currentTick = 1;
        const rendeColumns = jest.fn();
        animator.animate(ProjectFake, currentTick, ctx, rendeColumns);
        expect(Programs.run).toHaveBeenCalledWith('test program', {
                canvasHeight: 360,
                canvasWidth: 640,
                delta: 0,
                length: 2,
            }
        );
        expect(ctx.drawImage).toHaveBeenCalled();
    });
});