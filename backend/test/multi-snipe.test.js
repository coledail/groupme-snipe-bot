const { detectSnipe } = require('../src/services/snipeDetection');
const { createSnipeService } = require('../src/services/snipeService');

describe('multiple-victim snipes', () => {
  const message = {
    id: 'message-1',
    user_id: 'sniper-1',
    name: 'Sniper',
    text: '@Alice @Bob sniped',
    attachments: [
      { type: 'image', url: 'https://example.com/photo.jpg' },
      { type: 'mentions', user_ids: ['victim-1', 'victim-2', 'victim-1'] },
    ],
  };

  it('returns each distinct structured mention as a victim', () => {
    expect(detectSnipe(message)).toMatchObject({
      valid: true,
      victimId: 'victim-1',
      victimIds: ['victim-1', 'victim-2'],
    });
  });

  it('rejects a message when any mentioned victim is the sender', () => {
    expect(detectSnipe({
      ...message,
      attachments: [
        ...message.attachments.slice(0, 1),
        { type: 'mentions', user_ids: ['victim-2', 'sniper-1'] },
      ],
    })).toEqual({ valid: false });
  });

  it('stores one snipe per victim while sharing the message id', async () => {
    const created = [];
    const snipeRepository = {
      findByMessageId: jest.fn().mockResolvedValue(null),
      create: jest.fn(async (input) => {
        const snipe = { id: created.length + 1, ...input };
        created.push(snipe);
        return snipe;
      }),
    };
    const playerService = {
      findOrCreatePlayer: jest.fn(async (groupmeId) => ({ id: groupmeId, displayName: groupmeId })),
      getPlayerByGroupmeId: jest.fn().mockResolvedValue(null),
    };
    const service = createSnipeService(
      { snipeRepository, playerRepository: {} },
      { playerService, gameService: { getOrCreateActiveGame: jest.fn().mockResolvedValue({ id: 7 }) } },
    );

    const result = await service.processIncomingMessage(message);

    expect(created).toHaveLength(2);
    expect(created.map((snipe) => snipe.victimId)).toEqual(['victim-1', 'victim-2']);
    expect(created.every((snipe) => snipe.groupmeMessageId === 'message-1')).toBe(true);
    expect(result.snipe).toBe(created[0]);
    expect(result.snipes).toEqual(created);
  });
});
