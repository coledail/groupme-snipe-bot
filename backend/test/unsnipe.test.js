const { createSnipeService } = require('../src/services/snipeService');

describe('!unsnipe command', () => {
  it('marks the most recent active snipe as undone', async () => {
    const snipeRepository = {
      findMostRecentUnundone: jest.fn().mockResolvedValue({ id: 42, undone: false }),
      undo: jest.fn().mockResolvedValue({ id: 42, undone: true }),
    };

    const service = createSnipeService(
      { snipeRepository, playerRepository: {} },
      { playerService: {}, gameService: {} },
    );

    const result = await service.handleUnsnipeCommand({ text: '!unsnipe' });

    expect(snipeRepository.findMostRecentUnundone).toHaveBeenCalledTimes(1);
    expect(snipeRepository.undo).toHaveBeenCalledWith(42);
    expect(result).toEqual({ ok: true, snipe: { id: 42, undone: true } });
  });
});
