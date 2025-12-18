/**
 * Texas Hold'em Poker Game Engine Interface
 * Connects the poker game to the centralized AI strategy system
 */
class PokerGameEngine {
  constructor(aiServiceToken) {
    this.aiDecision = new PokerAIDecision(aiServiceToken);
    this.gameState = null;
    this.bots = [];
    this.humanPlayer = null;
    this.currentRound = null;
    this.potSize = 0;
    this.boardCards = [];
    this.deck = [];
    this.gameLog = []; // Keep track of game events
  }

  /**
   * Adds an event to the game log
   * @param {string} event - The event to log
   */
  logEvent(event) {
    this.gameLog.push({
      timestamp: new Date(),
      event,
      round: this.currentRound,
      potSize: this.potSize
    });
  }

  /**
   * Initializes the game with players
   * @param {Array} botPlayers - Array of bot player objects
   * @param {Object} humanPlayer - The human player object
   */
  initializeGame(botPlayers, humanPlayer) {
    // Validate inputs
    if (!Array.isArray(botPlayers) || botPlayers.length === 0) {
      throw new Error('At least one bot player is required');
    }

    if (!humanPlayer || typeof humanPlayer !== 'object') {
      throw new Error('Valid human player object is required');
    }

    this.bots = botPlayers.map((bot, index) => ({
      ...bot,
      id: index,
      stack: this.ensureValidStack(bot.startingStack || 2000),
      folded: false,
      betInCurrentRound: 0,
      position: bot.position || `BOT_${index}`,
      isActive: true
    }));

    this.humanPlayer = {
      ...humanPlayer,
      stack: this.ensureValidStack(humanPlayer.startingStack || 2000),
      folded: false,
      betInCurrentRound: 0,
      isActive: true
    };

    this.gameLog = []; // Reset game log
    this.resetRoundState();
    this.logEvent('Game initialized with players');
  }

  /**
   * Ensures stack value is within valid range
   * @param {number} stack - The stack value to validate
   * @returns {number} Validated stack value
   */
  ensureValidStack(stack) {
    const minStack = 100;
    const maxStack = 1000000;

    if (typeof stack !== 'number' || isNaN(stack)) {
      return minStack;
    }

    if (stack < minStack) {
      return minStack;
    }

    if (stack > maxStack) {
      return maxStack;
    }

    return Math.floor(stack);
  }

  /**
   * Resets the state for a new betting round
   */
  resetRoundState() {
    this.currentRound = 'preflop';
    this.potSize = 0;
    this.boardCards = [];
    this.deck = this.createShuffledDeck();

    // Reset bets for the round
    this.bots.forEach(bot => {
      bot.betInCurrentRound = 0;
      bot.folded = false;
      bot.isActive = true;
    });

    this.humanPlayer.betInCurrentRound = 0;
    this.humanPlayer.folded = false;
    this.humanPlayer.isActive = true;

    this.logEvent('Round state reset for new hand');
  }

  /**
   * Creates and shuffles a deck of cards
   * @returns {Array} Shuffled deck
   */
  createShuffledDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

    let deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }

    // Shuffle the deck using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.logEvent(`Deck created with ${deck.length} cards and shuffled`);
    return deck;
  }

  /**
   * Starts a new round of betting
   * @param {string} round - The round name ('preflop', 'flop', 'turn', 'river')
   * @param {Array} communityCards - Array of community cards
   * @returns {Promise<void>}
   */
  async startRound(round, communityCards = []) {
    // Validate round name
    const validRounds = ['preflop', 'flop', 'turn', 'river'];
    if (!validRounds.includes(round)) {
      throw new Error(`Invalid round: ${round}. Must be one of: ${validRounds.join(', ')}`);
    }

    this.currentRound = round;
    this.boardCards = [...communityCards]; // Create a copy to prevent external mutation

    // Calculate pot size based on total bets made so far
    this.updatePotSize();

    // Reset bet amounts for the round (except for forced bets like blinds)
    this.bots.forEach(bot => {
      bot.betInCurrentRound = 0;
    });
    this.humanPlayer.betInCurrentRound = 0;

    // If this is a new round after preflop, burn a card and deal
    if (round === 'flop' && this.boardCards.length === 0) {
      this.dealFlop();
      this.logEvent('Flop dealt');
    } else if (round === 'turn' && this.boardCards.length === 3) {
      this.dealTurn();
      this.logEvent('Turn card dealt');
    } else if (round === 'river' && this.boardCards.length === 4) {
      this.dealRiver();
      this.logEvent('River card dealt');
    }

    // At the start of each round, bots get a strategic decision
    await this.getBotStrategicIntent();
    this.logEvent(`Round ${round} started with ${this.bots.filter(b => !b.folded).length} active bots`);
  }

  /**
   * Deals the flop (first three community cards)
   */
  dealFlop() {
    if (this.deck.length < 4) { // Need 1 burn + 3 cards
      throw new Error('Not enough cards in deck to deal flop');
    }

    // Burn one card
    this.deck.shift();
    // Deal three community cards
    for (let i = 0; i < 3; i++) {
      if (this.deck.length > 0) {
        this.boardCards.push(this.deck.shift());
      }
    }
  }

  /**
   * Deals the turn (fourth community card)
   */
  dealTurn() {
    if (this.deck.length < 2) { // Need 1 burn + 1 card
      throw new Error('Not enough cards in deck to deal turn');
    }

    // Burn one card
    this.deck.shift();
    // Deal one community card
    if (this.deck.length > 0) {
      this.boardCards.push(this.deck.shift());
    }
  }

  /**
   * Deals the river (fifth community card)
   */
  dealRiver() {
    if (this.deck.length < 2) { // Need 1 burn + 1 card
      throw new Error('Not enough cards in deck to deal river');
    }

    // Burn one card
    this.deck.shift();
    // Deal one community card
    if (this.deck.length > 0) {
      this.boardCards.push(this.deck.shift());
    }
  }

  /**
   * Processes the human player's action
   * @param {string} action - The action ('fold', 'call', 'raise')
   * @param {number} amount - Bet/raise amount if applicable
   * @returns {Promise<Array>} Array of bot actions after the human action
   */
  async processHumanAction(action, amount = 0) {
    // Validate human action
    const validation = this.validateAction(this.humanPlayer, action, amount);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Apply the human action
    const actionResult = this.applyAction(this.humanPlayer, action, amount);
    this.logEvent(`Human player ${action} with amount ${amount}`);

    // After human acts, get bot responses based on strategic intent
    const botResults = await this.getBotStrategicResponses(action, amount);
    this.logEvent(`Bots responded to human action`);

    return botResults;
  }

  /**
   * Gets strategic intent from the AI after human action
   * @param {string} playerAction - The human player's action
   * @param {number} playerBetSize - Bet size of the human player
   * @returns {Promise<Array>} Bot actions based on strategic intent
   */
  async getBotStrategicResponses(playerAction, playerBetSize) {
    // Build game state for AI - include all relevant information
    const gameState = this.buildGameStateForAI(playerAction, playerBetSize);

    // Get AI decisions for all bots simultaneously
    const aiActions = await this.aiDecision.getAIActions(gameState);

    // Apply bot actions based on AI decisions
    const results = [];
    for (const aiAction of aiActions) {
      const bot = this.bots[aiAction.botIndex];
      if (bot && bot.isActive && !bot.folded) {
        // Validate the AI's suggested action is legal
        const actionValidation = this.validateAction(bot, aiAction.action, 0);
        if (actionValidation.valid) {
          const actionResult = this.applyAction(bot, aiAction.action, 0);
          results.push({
            botIndex: aiAction.botIndex,
            action: aiAction.action,
            result: actionResult,
            confidence: aiAction.confidence
          });
          this.logEvent(`Bot ${aiAction.botIndex} ${aiAction.action} with confidence ${aiAction.confidence}`);
        } else {
          // If AI action is illegal, use fallback strategy based on current game state
          const fallbackAction = this.getFallbackAction(bot, playerAction, playerBetSize);
          const actionResult = this.applyAction(bot, fallbackAction, 0);
          results.push({
            botIndex: aiAction.botIndex,
            action: fallbackAction,
            result: actionResult,
            confidence: 0.5 // Default confidence for fallback
          });
          this.logEvent(`Bot ${aiAction.botIndex} used fallback action: ${fallbackAction} after AI suggested ${aiAction.action}`);
        }
      }
    }

    // Check if betting round is complete after all bot actions
    if (this.isBettingRoundComplete()) {
      this.logEvent('Betting round completed after bot actions');
    } else {
      // If not complete, human needs to act again
      this.logEvent('Betting continues, human needs to act again');
    }

    return results;
  }

  /**
   * Gets a fallback action for a bot when AI action is invalid
   * @param {Object} bot - The bot object
   * @param {string} lastHumanAction - The last human action
   * @param {number} lastHumanBetSize - The last human bet size
   * @returns {string} Fallback action
   */
  getFallbackAction(bot, lastHumanAction, lastHumanBetSize) {
    // Calculate call amount needed
    const callAmount = this.calculateCallAmount(bot);

    // Determine action based on game state and difficulty level
    if (callAmount === 0) {
      // No bet to call, can check
      return 'call'; // In poker, "call" 0 is equivalent to "check"
    } else if (bot.stack >= callAmount) {
      // Can afford to call
      if (lastHumanAction === 'raise') {
        // Adjust response based on difficulty and raise size
        const raiseSize = lastHumanBetSize;
        const potRelativeRaise = raiseSize / (this.potSize || 100); // Avoid division by zero

        if (this.humanPlayer.difficulty === 'HARD') {
          // HARD mode: More aggressive, call/raise larger raises
          if (potRelativeRaise > 2.0) {
            return 'fold'; // Still fold very large raises
          } else if (potRelativeRaise > 1.0) {
            return 'call'; // Call moderately large raises
          } else {
            // Small raises might be called or re-raised depending on game state
            return Math.random() > 0.3 ? 'call' : 'raise';
          }
        } else if (this.humanPlayer.difficulty === 'EASY') {
          // EASY mode: More passive, fold more often
          if (potRelativeRaise > 0.5) {
            return 'fold';
          } else {
            return 'call';
          }
        } else {
          // NORMAL mode: Balanced response
          if (potRelativeRaise > 1.5) {
            return 'fold';
          } else if (potRelativeRaise > 0.8) {
            return 'call';
          } else {
            // Small raises - can call or occasionally re-raise
            return Math.random() > 0.2 ? 'call' : 'raise';
          }
        }
      }
      return 'call'; // Default safe action
    } else {
      // Can't afford to call, must go all-in or fold
      if (this.humanPlayer.difficulty === 'HARD' && Math.random() > 0.6) {
        // HARD mode: sometimes go all-in with good hands or as bluff
        return 'raise'; // Will go all-in since can't afford full call
      } else if (this.humanPlayer.difficulty === 'EASY') {
        // EASY mode: more likely to fold when short-stacked
        return 'fold';
      } else {
        // NORMAL mode: moderate risk-taking
        return Math.random() > 0.5 ? 'raise' : 'fold';
      }
    }
  }

  /**
   * Checks if the current betting round is complete
   * @return {boolean} True if betting round is complete
   */
  isBettingRoundComplete() {
    // Betting round is complete when all active players have matched the highest bet
    const activePlayers = [this.humanPlayer, ...this.bots.filter(b => b.isActive && !b.folded)];

    if (activePlayers.length <= 1) {
      return true; // Only one player left
    }

    // Check if all active players have the same bet amount in current round
    const betAmounts = activePlayers.map(p => p.betInCurrentRound);
    const uniqueBetAmounts = [...new Set(betAmounts)];

    // If all active players have the same bet amount, round is complete
    return uniqueBetAmounts.length === 1;
  }

  /**
   * Gets a fallback action for a bot when AI action is invalid
   * @param {Object} bot - The bot object
   * @returns {string} Fallback action
   */
  getFallbackAction(bot) {
    // If bot can call, do that. Otherwise, fold.
    const callAmount = this.calculateCallAmount(bot);
    if (bot.stack >= callAmount) {
      return 'call';
    } else {
      return 'fold';
    }
  }

  /**
   * Gets strategic intent for this round (called at round start)
   * @returns {Promise<void>}
   */
  async getBotStrategicIntent() {
    // Build game state for AI with neutral player action for round start
    const gameState = this.buildGameStateForAI('CHECK', 0);

    // Get AI decisions (this sets up the strategic framework for the round)
    await this.aiDecision.getAIActions(gameState);
    this.logEvent('AI strategic intent obtained for round');
  }

  /**
   * Builds game state object for the AI
   * @param {string} playerAction - The human player's action
   * @param {number} playerBetSize - Bet size of the human player
   * @returns {Object} Game state object for AI
   */
  buildGameStateForAI(playerAction, playerBetSize) {
    // Determine board texture based on community cards
    const boardTexture = this.analyzeBoardTexture();

    // Determine positions (relative to dealer button)
    const botPositions = this.bots.map(bot => bot.position || 'unknown');

    // Player profile attributes (based on past behavior or defaults)
    const playerProfile = {
      aggression: this.humanPlayer.aggression || 0.5,
      tightness: this.humanPlayer.tightness || 0.5,
      bluffing: this.humanPlayer.bluffing || 0.3
    };

    return {
      difficulty: this.humanPlayer.difficulty || 'NORMAL',
      round: this.currentRound,
      potSize: this.potSize,
      playerAction,
      playerBetSize,
      playerStack: this.humanPlayer.stack,
      playerPosition: this.humanPlayer.position || 'BTN',
      playerProfile,
      boardTexture,
      botStacks: this.bots.map(bot => bot.stack),
      botPositions,
      sharedBotState: {
        lastGlobalPlan: this.humanPlayer.lastGlobalPlan || 'pot_control',
        playerFoldedToPressure: this.humanPlayer.foldedToPressure || false
      },
      legalActions: this.getLegalActions()
    };
  }

  /**
   * Analyzes the board texture for the AI
   * @returns {string} Board texture ('wet', 'dry', 'drawy')
   */
  analyzeBoardTexture() {
    if (this.boardCards.length < 3) {
      return 'unknown'; // Preflop
    }

    // Simplified analysis based on connectedness and flush possibilities
    const ranks = this.boardCards.map(card => this.cardRankValue(card.rank));
    const suits = this.boardCards.map(card => card.suit);

    // Check for straight possibilities (connectedness)
    const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b); // Unique ranks, sorted
    let straightDraw = false;

    // Check for potential straights (gaps of 1 or 2 cards)
    if (sortedRanks.length >= 2) {
      for (let i = 0; i < sortedRanks.length - 1; i++) {
        if (sortedRanks[i+1] - sortedRanks[i] <= 4) { // Potential for straight
          straightDraw = true;
          break;
        }
      }
    }

    // Check for flush possibilities (suitedness)
    const suitCounts = {};
    for (const suit of suits) {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    }

    const maxSuitCount = Math.max(...Object.values(suitCounts));
    const flushPossible = maxSuitCount >= 2;

    // Determine texture based on these factors
    if (straightDraw || flushPossible) {
      return 'wet';
    } else if (this.boardCards.length >= 3) {
      // More complex analysis could go here
      return 'dry';
    }

    return 'unknown';
  }

  /**
   * Converts card rank to numerical value
   * @param {string} rank - Card rank (2-9, T, J, Q, K, A)
   * @returns {number} Numerical value
   */
  cardRankValue(rank) {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    if (rank === 'T') return 10;
    const numRank = parseInt(rank);
    if (isNaN(numRank) || numRank < 2 || numRank > 9) {
      throw new Error(`Invalid card rank: ${rank}`);
    }
    return numRank;
  }

  /**
   * Gets the legal actions for the current situation
   * @returns {Array} Array of legal actions
   */
  getLegalActions() {
    // Basic legal actions - could be more nuanced based on game rules
    return ['fold', 'call', 'raise'];
  }

  /**
   * Validates if an action is legal for a player
   * @param {Object} player - The player object
   * @param {string} action - The action to validate
   * @param {number} amount - Amount if relevant
   * @returns {Object} Validation result with valid flag and message
   */
  validateAction(player, action, amount) {
    // Check if player is active
    if (!player.isActive || player.folded) {
      return { valid: false, message: 'Player is not active or has folded' };
    }

    // Basic validation
    const legalActions = this.getLegalActions();
    if (!legalActions.includes(action)) {
      return { valid: false, message: `Invalid action: ${action}. Legal actions: ${legalActions.join(', ')}` };
    }

    // Check if player has enough chips for the action
    if (action === 'raise') {
      if (typeof amount !== 'number' || amount <= 0) {
        return { valid: false, message: 'Raise amount must be a positive number' };
      }

      if (player.stack < amount) {
        return { valid: false, message: `Player does not have enough chips to raise ${amount}. Current stack: ${player.stack}` };
      }

      // Check if raise is at least minimum required
      const minRaise = this.calculateMinRaise();
      if (amount < minRaise) {
        return { valid: false, message: `Raise amount must be at least ${minRaise}` };
      }
    }

    if (action === 'call') {
      const callAmount = this.calculateCallAmount(player);
      if (player.stack < callAmount) {
        // Player can still go all-in with a call action
        return { valid: true, message: 'Player can go all-in' };
      }
    }

    return { valid: true, message: 'Action is valid' };
  }

  /**
   * Calculates the minimum raise amount
   * @returns {number} Minimum raise amount
   */
  calculateMinRaise() {
    // Minimum raise is typically the size of the previous bet or big blind
    let highestBet = 0;
    for (const bot of this.bots) {
      if (!bot.folded && bot.betInCurrentRound > highestBet) {
        highestBet = bot.betInCurrentRound;
      }
    }

    if (this.humanPlayer.betInCurrentRound > highestBet) {
      highestBet = this.humanPlayer.betInCurrentRound;
    }

    // Minimum raise is the difference between current highest bet and a call amount, plus the call amount
    const callAmount = this.calculateCallAmount(this.humanPlayer); // Use human player as example
    return callAmount > 0 ? callAmount + callAmount : 10; // Default to small amount if no bets yet
  }

  /**
   * Applies an action to a player
   * @param {Object} player - The player object
   * @param {string} action - The action to apply
   * @param {number} amount - Amount if relevant
   * @returns {Object} Result of the action
   */
  applyAction(player, action, amount) {
    try {
      switch (action) {
        case 'fold':
          player.folded = true;
          player.isActive = false;
          break;

        case 'call':
          // Call means matching the highest bet
          const callAmount = Math.min(this.calculateCallAmount(player), player.stack);
          if (callAmount > 0) {
            player.stack -= callAmount;
            player.betInCurrentRound += callAmount;
            this.potSize += callAmount;
          }
          break;

        case 'raise':
          // Ensure the amount is valid
          const actualRaise = Math.min(amount, player.stack);
          if (actualRaise > 0) {
            player.stack -= actualRaise;
            player.betInCurrentRound += actualRaise;
            this.potSize += actualRaise;
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return {
        success: true,
        action,
        amount: action === 'call' ? Math.min(this.calculateCallAmount(player), player.stack) :
                 action === 'raise' ? Math.min(amount, player.stack) : 0,
        remainingStack: player.stack
      };
    } catch (error) {
      this.logEvent(`Error applying action ${action}: ${error.message}`);
      return {
        success: false,
        action,
        error: error.message
      };
    }
  }

  /**
   * Calculates the amount needed to call
   * @param {Object} player - The player object
   * @returns {number} Amount needed to call
   */
  calculateCallAmount(player) {
    // Find the highest bet in the current round
    let highestBet = 0;

    for (const bot of this.bots) {
      if (!bot.folded && bot.betInCurrentRound > highestBet) {
        highestBet = bot.betInCurrentRound;
      }
    }

    if (!this.humanPlayer.folded && this.humanPlayer.betInCurrentRound > highestBet) {
      highestBet = this.humanPlayer.betInCurrentRound;
    }

    return Math.max(0, highestBet - player.betInCurrentRound);
  }

  /**
   * Updates the pot size based on all bets made
   */
  updatePotSize() {
    let total = 0;

    // Add all bets from bots
    for (const bot of this.bots) {
      total += bot.betInCurrentRound;
    }

    // Add human player's bet
    total += this.humanPlayer.betInCurrentRound;

    this.potSize = total;
  }

  /**
   * Checks if the round is complete
   * @returns {boolean} True if round is complete
   */
  isRoundComplete() {
    // Round is complete when all active players have matched the highest bet
    const activePlayers = [this.humanPlayer, ...this.bots.filter(b => !b.folded && b.isActive)];

    if (activePlayers.length <= 1) {
      return true;
    }

    // Check if all active players have the same bet amount in current round
    const betAmounts = [...new Set(activePlayers.map(p => p.betInCurrentRound))];

    // If all active players have the same bet amount, round is complete
    if (betAmounts.length === 1) {
      return true;
    }

    // Check if there's a betting round completion condition:
    // All players have either folded, are all-in, or have called the highest bet
    const highestBet = Math.max(...activePlayers.map(p => p.betInCurrentRound));
    const playersWithHighestBet = activePlayers.filter(p => p.betInCurrentRound === highestBet);
    const allInPlayers = activePlayers.filter(p => p.stack === 0);

    // If all active players either have the highest bet or are all-in, round is complete
    return playersWithHighestBet.length + allInPlayers.length === activePlayers.length;
  }

  /**
   * Checks if the hand is complete
   * @returns {boolean} True if hand is complete
   */
  isHandComplete() {
    // Hand is complete if all rounds are done or everyone except one has folded
    const activePlayers = [this.humanPlayer, ...this.bots.filter(b => !b.folded && b.isActive)];
    return activePlayers.length <= 1;
  }

  /**
   * Gets the current state of the game
   * @returns {Object} Current game state
   */
  getCurrentGameState() {
    return {
      currentRound: this.currentRound,
      potSize: this.potSize,
      boardCards: [...this.boardCards],
      humanPlayer: {
        id: 'human',
        stack: this.humanPlayer.stack,
        folded: this.humanPlayer.folded,
        betInCurrentRound: this.humanPlayer.betInCurrentRound,
        isActive: this.humanPlayer.isActive
      },
      bots: this.bots.map(bot => ({
        id: bot.id,
        stack: bot.stack,
        folded: bot.folded,
        betInCurrentRound: bot.betInCurrentRound,
        position: bot.position,
        isActive: bot.isActive
      }))
    };
  }

  /**
   * Gets the game log
   * @returns {Array} Array of game events
   */
  getGameLog() {
    return [...this.gameLog]; // Return a copy to prevent external modification
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PokerGameEngine;
} else if (typeof window !== 'undefined') {
  window.PokerGameEngine = PokerGameEngine;
}