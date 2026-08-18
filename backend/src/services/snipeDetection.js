function detectSnipe(message) {
  if (!message || typeof message !== 'object') return { valid: false };

  const text = (message.text || '').toLowerCase();
  const hasSnipedWord = /\bsniped\b/i.test(message.text || '');
  const attachments = message.attachments || message.photos || [];
  const hasImage = Array.isArray(attachments) && attachments.length > 0 && attachments.some((a) => {
    if (!a) return false;
    return a.type === 'image' || a.type === 'photo' || a.url || a.photo_url;
  });

  if (!hasSnipedWord || !hasImage) return { valid: false };

  // Try to extract an @mention like "@John" — GroupMe payloads vary,
  // so we use a simple heuristic: first @word in the text.
  const mentionMatch = (message.text || '').match(/@([\w\-\.\s]+)/);
  const victimMention = mentionMatch ? mentionMatch[1].trim() : null;

  // Best-effort IDs from common GroupMe payload fields.
  const sniperId = message.user_id || message.sender_id || message.sender && message.sender.id || message.user && message.user.id || null;
  const imageUrl = (attachments[0] && (attachments[0].url || attachments[0].photo_url)) || null;

  if (!victimMention) {
    // Without a mention we can't attribute a victim reliably.
    return { valid: false };
  }

  return {
    valid: true,
    sniperId: String(sniperId || (message.name || 'unknown')),
    victimId: victimMention,
    imageUrl,
  };
}

module.exports = { detectSnipe };
