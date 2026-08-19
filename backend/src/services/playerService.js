function createPlayerService(playerRepository) {
  async function findOrCreatePlayer(groupmeUserId, displayName) {
    if (!groupmeUserId) {
      throw new Error('groupmeUserId is required');
    }
    return await playerRepository.upsert(groupmeUserId, displayName || 'Unknown');
  }

  async function getPlayerByGroupmeId(groupmeUserId) {
    return await playerRepository.findByGroupmeId(groupmeUserId);
  }

  async function updatePlayer(id, data) {
    if (data.displayName === undefined) {
      return await playerRepository.findById(id);
    }
    return await playerRepository.updateDisplayName(id, data.displayName);
  }

  return { findOrCreatePlayer, getPlayerByGroupmeId, updatePlayer };
}

module.exports = { createPlayerService };
