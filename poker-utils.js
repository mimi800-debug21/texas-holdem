/**
 * Texas Hold'em Poker Utilities
 * Helper functions for poker game mechanics
 */

/**
 * Formats currency values for display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = '$') {
  return `${currency}${amount.toLocaleString()}`;
}

/**
 * Determines the strength of a poker hand
 * Note: This is a simplified version that only evaluates basic hand categories
 * @param {Array} holeCards - Array of two player hole cards
 * @param {Array} communityCards - Array of community cards
 * @returns {Object} Hand evaluation result
 */
function evaluatePokerHand(holeCards, communityCards) {
  // Combine hole cards and community cards
  const allCards = [...holeCards, ...communityCards];
  
  // Ensure we have exactly 7 cards to evaluate (2 hole + 5 community)
  if (allCards.length < 5) {
    return { category: 'high_card', value: 0, description: 'Incomplete hand' };
  }
  
  // Count ranks and suits
  const ranks = [];
  const suits = [];
  
  for (const card of allCards) {
    ranks.push(getCardRankValue(card.rank));
    suits.push(card.suit);
  }
  
  // Sort ranks in descending order
  ranks.sort((a, b) => b - a);
  
  // Count occurrences of each rank
  const rankCounts = {};
  for (const rank of ranks) {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  }
  
  // Count occurrences of each suit
  const suitCounts = {};
  for (const suit of suits) {
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  }
  
  // Get sorted counts
  const sortedRankCounts = Object.values(rankCounts).sort((a, b) => b - a);
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  
  // Check for straight
  let isStraight = false;
  let isWheel = false; // A-2-3-4-5 straight
  
  // Get unique sorted ranks
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  
  // Check for wheel (A-2-3-4-5)
  if (uniqueRanks.includes(14) && uniqueRanks.includes(5) && 
      uniqueRanks.includes(4) && uniqueRanks.includes(3) && uniqueRanks.includes(2)) {
    isWheel = true;
  } else {
    // Check for regular straights
    if (uniqueRanks.length >= 5) {
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        let isSeq = true;
        for (let j = 0; j < 4; j++) {
          if (uniqueRanks[i + j] - 1 !== uniqueRanks[i + j + 1]) {
            isSeq = false;
            break;
          }
        }
        if (isSeq) {
          isStraight = true;
          break;
        }
      }
    }
  }
  
  // Check for straight flush and royal flush
  const isFlush = maxSuitCount >= 5;
  
  // For flush detection, find if 5+ cards of same suit form a straight
  let isStraightFlush = false;
  let isRoyalFlush = false;
  
  if (isFlush) {
    for (const suit in suitCounts) {
      if (suitCounts[suit] >= 5) {
        const suitedRanks = allCards
          .filter(card => card.suit === suit)
          .map(card => getCardRankValue(card.rank))
          .sort((a, b) => b - a);
          
        const uniqueSuitedRanks = [...new Set(suitedRanks)];
        
        // Check for straight in suited cards
        if (uniqueSuitedRanks.length >= 5) {
          for (let i = 0; i <= uniqueSuitedRanks.length - 5; i++) {
            let isSeq = true;
            for (let j = 0; j < 4; j++) {
              if (uniqueSuitedRanks[i + j] - 1 !== uniqueSuitedRanks[i + j + 1]) {
                isSeq = false;
                break;
              }
            }
            if (isSeq) {
              isStraightFlush = true;
              
              // Check for royal flush (10-J-Q-K-A)
              if (uniqueSuitedRanks[0] === 14 && uniqueSuitedRanks.includes(13) && 
                  uniqueSuitedRanks.includes(12) && uniqueSuitedRanks.includes(11) && 
                  uniqueSuitedRanks.includes(10)) {
                isRoyalFlush = true;
              }
              break;
            }
          }
          
          // Check for wheel straight flush (A-2-3-4-5 of same suit)
          if (!isStraightFlush && uniqueSuitedRanks.includes(14) && 
              uniqueSuitedRanks.includes(5) && uniqueSuitedRanks.includes(4) && 
              uniqueSuitedRanks.includes(3) && uniqueSuitedRanks.includes(2)) {
            isStraightFlush = true;
          }
        }
      }
    }
  }
  
  // Determine hand rank
  let category, value, description;
  
  if (isRoyalFlush) {
    category = 'royal_flush';
    value = 10;
    description = 'Royal Flush';
  } else if (isStraightFlush) {
    category = 'straight_flush';
    value = 9;
    description = 'Straight Flush';
  } else if (sortedRankCounts[0] === 4) {
    category = 'four_of_a_kind';
    value = 8;
    description = 'Four of a Kind';
  } else if (sortedRankCounts[0] === 3 && sortedRankCounts[1] === 2) {
    category = 'full_house';
    value = 7;
    description = 'Full House';
  } else if (isFlush) {
    category = 'flush';
    value = 6;
    description = 'Flush';
  } else if (isStraight || isWheel) {
    category = 'straight';
    value = 5;
    description = 'Straight';
  } else if (sortedRankCounts[0] === 3) {
    category = 'three_of_a_kind';
    value = 4;
    description = 'Three of a Kind';
  } else if (sortedRankCounts[0] === 2 && sortedRankCounts[1] === 2) {
    category = 'two_pair';
    value = 3;
    description = 'Two Pair';
  } else if (sortedRankCounts[0] === 2) {
    category = 'one_pair';
    value = 2;
    description = 'One Pair';
  } else {
    category = 'high_card';
    value = 1;
    description = 'High Card';
  }
  
  return { category, value, description, details: { rankCounts, suitCounts } };
}

/**
 * Gets the numerical value of a card rank
 * @param {string} rank - Card rank ('2', '3', ..., 'T', 'J', 'Q', 'K', 'A')
 * @returns {number} Numerical value
 */
function getCardRankValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  if (rank === 'T') return 10;
  return parseInt(rank);
}

/**
 * Converts rank value back to rank representation
 * @param {number} value - Rank value (2-14)
 * @returns {string} Rank character
 */
function getRankFromValue(value) {
  if (value === 14) return 'A';
  if (value === 13) return 'K';
  if (value === 12) return 'Q';
  if (value === 11) return 'J';
  if (value === 10) return 'T';
  return value.toString();
}

/**
 * Compares two poker hands to determine winner
 * @param {Array} hand1 - First hand (2 cards)
 * @param {Array} communityCards - Community cards (5 cards)
 * @param {Array} hand2 - Second hand (2 cards)
 * @returns {number} 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
function comparePokerHands(hand1, communityCards, hand2) {
  const eval1 = evaluatePokerHand(hand1, communityCards);
  const eval2 = evaluatePokerHand(hand2, communityCards);
  
  if (eval1.value > eval2.value) return 1;
  if (eval1.value < eval2.value) return -1;
  
  // If hand values are equal, we'd need more complex comparison
  // For simplicity, just return 0 (tie) in this implementation
  return 0;
}

/**
 * Generates a random poker hand
 * @returns {Array} Array of two hole cards
 */
function generateRandomHoleCards() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  
  // Pick two random cards ensuring they're different
  let card1, card2;
  do {
    card1 = {
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      suit: suits[Math.floor(Math.random() * suits.length)]
    };
    card2 = {
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      suit: suits[Math.floor(Math.random() * suits.length)]
    };
  } while (card1.rank === card2.rank && card1.suit === card2.suit);
  
  return [card1, card2];
}

/**
 * Converts card objects to a readable string
 * @param {Array} cards - Array of card objects
 * @returns {string} Readable card string
 */
function cardsToString(cards) {
  if (!cards || cards.length === 0) return '';
  
  return cards.map(card => `${card.rank}${card.suit.charAt(0)}`).join(', ');
}

/**
 * Determines the winning player(s) at the end of a hand
 * @param {Array} playerHands - Array of player hand info
 * @param {Array} communityCards - Community cards
 * @returns {Array} Array of winning player indices
 */
function determineWinners(playerHands, communityCards) {
  if (playerHands.length === 0) return [];
  
  // Evaluate each active player's hand
  const evaluations = playerHands.map((handInfo, index) => {
    if (!handInfo.active) {
      // Folded players don't win anything
      return { index, value: -1 }; // Lower than any valid hand
    }
    
    const evaluation = evaluatePokerHand(handInfo.cards, communityCards);
    return {
      index,
      value: evaluation.value,
      category: evaluation.category,
      details: evaluation.details
    };
  });
  
  // Find the highest hand value
  const maxHandValue = Math.max(...evaluations.map(e => e.value));
  
  // Find all players with the highest hand value
  const winners = evaluations.filter(e => e.value === maxHandValue).map(e => e.index);
  
  return winners;
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    evaluatePokerHand,
    getCardRankValue,
    getRankFromValue,
    comparePokerHands,
    generateRandomHoleCards,
    cardsToString,
    determineWinners
  };
} else if (typeof window !== 'undefined') {
  window.PokerUtils = {
    formatCurrency,
    evaluatePokerHand,
    getCardRankValue,
    getRankFromValue,
    comparePokerHands,
    generateRandomHoleCards,
    cardsToString,
    determineWinners
  };
}