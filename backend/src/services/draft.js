// Generate an 18-slot snake draft order for 6 users
// Snake: [0,1,2,3,4,5, 5,4,3,2,1,0, 0,1,2,3,4,5]
function generateSnakeOrder(userIds) {
  if (userIds.length !== 6) throw new Error('Expected exactly 6 users');

  // Shuffle
  const shuffled = [...userIds].sort(() => Math.random() - 0.5);

  const round1 = [...shuffled];           // 0-5
  const round2 = [...shuffled].reverse(); // 5-4-3-2-1-0
  const round3 = [...shuffled];           // 0-5

  return [...round1, ...round2, ...round3]; // 18 entries
}

// Given the 18-slot draftOrder array and a slot index, which user ID is up?
function whoseTurn(draftOrder, currentDraftTurn) {
  if (currentDraftTurn >= draftOrder.length) return null;
  return draftOrder[currentDraftTurn];
}

// How many picks has a user made in a major (0–3)
function userPickCount(picks, userId) {
  return picks.filter((p) => p.userId === userId).length;
}

module.exports = { generateSnakeOrder, whoseTurn, userPickCount };
