function createGameService(gameRepository) {
  async function getActiveGame() {
    return await gameRepository.getActive();
  }

  async function getOrCreateActiveGame() {
    const existing = await gameRepository.getActive();
    if (existing) return existing;

    const year = new Date().getFullYear();
    return await gameRepository.createActive(`Season ${year}`);
  }

  async function startNewGame(name) {
    const finalName = name && name.trim().length > 0 ? name.trim() : `Season ${new Date().getFullYear()}`;
    return await gameRepository.createActive(finalName);
  }

  async function listGames() {
    return await gameRepository.listAll();
  }

  async function activateGame(gameId) {
    return await gameRepository.activate(gameId);
  }

  return { getActiveGame, getOrCreateActiveGame, startNewGame, listGames, activateGame };
}

module.exports = { createGameService };
