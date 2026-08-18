function createGameService(gameRepository) {
  async function getActiveGame() {
    return gameRepository.getActive();
  }

  async function getOrCreateActiveGame() {
    const existing = gameRepository.getActive();
    if (existing) return existing;

    const year = new Date().getFullYear();
    return gameRepository.createActive(`Season ${year}`);
  }

  async function startNewGame(name) {
    const finalName = name && name.trim().length > 0 ? name.trim() : `Season ${new Date().getFullYear()}`;
    return gameRepository.createActive(finalName);
  }

  async function listGames() {
    return gameRepository.listAll();
  }

  async function activateGame(gameId) {
    return gameRepository.activate(gameId);
  }

  return { getActiveGame, getOrCreateActiveGame, startNewGame, listGames, activateGame };
}

module.exports = { createGameService };
