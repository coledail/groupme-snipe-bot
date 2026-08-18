function createPlayerService(playerRepository) {
  async function findOrCreatePlayer(groupmeUserId, displayName) {
    if (!groupmeUserId) {
      throw new Error('groupmeUserId is required');
    }
    return playerRepository.upsert(groupmeUserId, displayName || 'Unknown');
  }

  async function getPlayerByGroupmeId(groupmeUserId) {
    return playerRepository.findByGroupmeId(groupmeUserId);
  }

  async function updatePlayer(id, data) {
    if (data.displayName === undefined) {
      return playerRepository.findById(id);
    }
    return playerRepository.updateDisplayName(id, data.displayName);
  }

  return { findOrCreatePlayer, getPlayerByGroupmeId, updatePlayer };
}

module.exports = { createPlayerService };
