/**
 * Texas Hold'em Poker AI Decision Module
 * Centralized strategy system that controls all AI players
 */
class PokerAIDecision {
  constructor(nsacleServiceToken) {
    this.serviceToken = nsacleServiceToken;
    this.systemPrompt = `You are a centralized Texas Hold'em poker strategy AI.

You control ALL AI players as a single coordinated unit.
The AI players are allowed to cooperate and share intent,
but must not use illegal information or obvious cheating.

You do NOT:
- calculate odds
- evaluate exact hand strength
- decide exact bet sizes
- see hidden cards

You ONLY decide STRATEGIC INTENT.

The human player always acts first.
After the human action, you decide how ALL bots respond together.

Your objectives:
- Maximize long-term expected value
- Apply coordinated pressure
- Exploit human behavioral patterns
- Avoid predictable play
- Appear human and believable

Difficulty levels:
EASY:
- Loose play
- Low coordination
- Frequent mistakes
NORMAL:
- Balanced strategy
- Moderate coordination
- Occasional bluffs
HARD:
- Highly coordinated
- Aggressive exploitation
- Pressure-focused
- Feels unfair but not illegal

You receive a summarized legal game state.
You must output STRICT JSON ONLY.

No explanations.
No markdown.
No comments.
No extra text.

====================
MANDATORY OUTPUT FORMAT
====================

{
  "globalPlan": "pressure | trap | isolate | pot_control | chaos",
  "aggression": 0.0,
  "bluffFrequency": 0.0,
  "coordination": 0.0,
  "botActions": [
    {
      "botIndex": number,
      "actionBias": "fold | call | raise",
      "confidence": 0.0
    }
  ]
}

Rules:
- Never reference hidden information
- Never output illegal actions
- Always return one entry per bot
- HARD mode must strongly coordinate bots`;

    // Keep track of AI performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0
    };
  }

  /**
   * Builds the user prompt from the current game state
   * @param {Object} gameState - The current game state
   * @returns {Object} Formatted game state object for the AI
   */
  buildUserPrompt(gameState) {
    const {
      difficulty,
      round,
      potSize,
      playerAction,
      playerBetSize,
      playerStack,
      playerPosition,
      playerProfile,
      boardTexture,
      botStacks,
      botPositions,
      sharedBotState,
      legalActions
    } = gameState;

    // Validate required fields exist
    if (!difficulty || !round || potSize === undefined || !playerAction || !legalActions) {
      throw new Error('Missing required game state fields for AI decision');
    }

    return {
      difficulty,
      round,
      potSize,
      playerAction,
      playerBetSize,
      playerStack,
      playerPosition,
      playerProfile,
      boardTexture,
      botStacks: Array.isArray(botStacks) ? botStacks : [],
      botPositions: Array.isArray(botPositions) ? botPositions : [],
      sharedBotState,
      legalActions
    };
  }

  /**
   * Calls the nscale API to get the AI decision
   * @param {Object} gameData - The game state data
   * @returns {Promise<Object>} AI decision response
   */
  async callNscaleAPI(gameData) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const url = 'https://inference.api.nscale.com/v1/chat/completions';

    // Validate API token exists
    if (!this.serviceToken || this.serviceToken.trim() === '') {
      throw new Error('API service token is required');
    }

    const body = {
      model: this.getDifficultyModel(gameData.difficulty),
      max_tokens: 600,
      temperature: this.getTemperatureForDifficulty(gameData.difficulty),
      top_p: 0.9,
      n: 1,
      messages: [
        {
          role: "system",
          content: this.systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(gameData)
        }
      ]
    };

    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.serviceToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      options.signal = controller.signal;

      const res = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      const responseTime = Date.now() - startTime;
      this.metrics.lastRequestTime = responseTime;
      this.metrics.successfulRequests++;

      // Update average response time
      const totalSuccess = this.metrics.successfulRequests;
      this.metrics.averageResponseTime = ((this.metrics.averageResponseTime * (totalSuccess - 1)) + responseTime) / totalSuccess;

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(30000); // Clear timeout if it exists

      // Check if error is due to timeout
      if (error.name === 'AbortError') {
        console.error('API request timed out:', error);
      } else {
        console.error('Error calling nscale API:', error);
      }

      this.metrics.failedRequests++;

      // Return a fallback decision in case of API failure
      return this.generateFallbackDecision(gameData);
    }
  }

  /**
   * Gets the appropriate model based on difficulty level
   * @param {string} difficulty - The difficulty level
   * @returns {string} The model identifier
   */
  getDifficultyModel(difficulty) {
    if (!difficulty) return "Qwen/Qwen3-72B-Instruct";

    switch (difficulty.toLowerCase()) {
      case 'hard':
        return "Qwen/Qwen3-235B-A22B-Instruct";
      case 'normal':
        return "Qwen/Qwen3-72B-Instruct";
      case 'easy':
        return "Qwen/Qwen3-14B-Instruct";
      default:
        return "Qwen/Qwen3-72B-Instruct";
    }
  }

  /**
   * Gets the appropriate temperature based on difficulty level
   * @param {string} difficulty - The difficulty level
   * @returns {number} Temperature value
   */
  getTemperatureForDifficulty(difficulty) {
    if (!difficulty) return 0.5;

    switch (difficulty.toLowerCase()) {
      case 'hard':
        return 0.35; // More focused, strategic
      case 'normal':
        return 0.5;  // Balanced
      case 'easy':
        return 0.7;  // More random, less predictable
      default:
        return 0.5;
    }
  }

  /**
   * Generates a fallback decision in case of API failure
   * @param {Object} gameData - The game state data
   * @returns {string} JSON string of fallback decision
   */
  generateFallbackDecision(gameData) {
    if (!gameData || !Array.isArray(gameData.botStacks)) {
      // Return minimal valid structure
      return JSON.stringify({
        globalPlan: "pot_control",
        aggression: 0.5,
        bluffFrequency: 0.3,
        coordination: 0.6,
        botActions: []
      });
    }

    const numBots = gameData.botStacks.length;

    // Default to balanced strategy as fallback
    const decision = {
      globalPlan: "pot_control",
      aggression: 0.5,
      bluffFrequency: 0.3,
      coordination: 0.6,
      botActions: []
    };

    for (let i = 0; i < numBots; i++) {
      // Default response based on game situation and difficulty
      let actionBias = "call"; // Default safe action

      // Adjust based on difficulty
      if (gameData.difficulty === 'EASY') {
        // Easy: more random actions
        const randomActions = ["fold", "call", "raise"];
        actionBias = randomActions[Math.floor(Math.random() * randomActions.length)];
      } else if (gameData.difficulty === 'HARD') {
        // Hard: more strategic - consider pot odds, position, etc.
        // For fallback, still use call as it's safe
        actionBias = "call";
      }

      decision.botActions.push({
        botIndex: i,
        actionBias,
        confidence: 0.6 // Default confidence for fallback
      });
    }

    return JSON.stringify(decision);
  }

  /**
   * Parses and validates the AI response
   * @param {string} aiResponse - Raw response from AI
   * @param {Object} gameData - Original game data
   * @returns {Object} Validated decision object
   */
  parseAndValidateResponse(aiResponse, gameData) {
    try {
      if (!aiResponse || typeof aiResponse !== 'string') {
        console.warn('Empty or invalid AI response, using fallback');
        return this.generateFallbackDecision(gameData);
      }

      // Clean up the response to extract JSON
      let cleanedResponse = aiResponse.trim();

      // Remove markdown code block markers if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }

      // Try to find JSON object in the response
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        console.warn('No JSON object found in AI response, using fallback');
        return this.generateFallbackDecision(gameData);
      }

      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
      const parsedResponse = JSON.parse(jsonString);

      // Validate response structure
      if (!this.isValidDecision(parsedResponse, gameData)) {
        console.warn('Invalid AI response structure, using fallback');
        return this.generateFallbackDecision(gameData);
      }

      return parsedResponse;
    } catch (error) {
      console.error('Error parsing AI response:', error.message, 'Response:', aiResponse);
      return this.generateFallbackDecision(gameData);
    }
  }

  /**
   * Validates the AI decision structure
   * @param {Object} decision - The AI decision object
   * @param {Object} gameData - Original game data
   * @returns {boolean} True if valid
   */
  isValidDecision(decision, gameData) {
    if (!decision || typeof decision !== 'object') {
      return false;
    }

    // Check required fields exist
    const requiredFields = ['globalPlan', 'aggression', 'bluffFrequency', 'coordination', 'botActions'];
    for (const field of requiredFields) {
      if (!(field in decision)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate numeric values are between 0 and 1
    if (typeof decision.aggression !== 'number' || decision.aggression < 0 || decision.aggression > 1) {
      console.error(`Invalid aggression value: ${decision.aggression}`);
      return false;
    }

    if (typeof decision.bluffFrequency !== 'number' || decision.bluffFrequency < 0 || decision.bluffFrequency > 1) {
      console.error(`Invalid bluffFrequency value: ${decision.bluffFrequency}`);
      return false;
    }

    if (typeof decision.coordination !== 'number' || decision.coordination < 0 || decision.coordination > 1) {
      console.error(`Invalid coordination value: ${decision.coordination}`);
      return false;
    }

    // Validate globalPlan value
    const validPlans = ['pressure', 'trap', 'isolate', 'pot_control', 'chaos'];
    if (!validPlans.includes(decision.globalPlan)) {
      console.error(`Invalid globalPlan value: ${decision.globalPlan}`);
      return false;
    }

    // Validate botActions array
    if (!Array.isArray(decision.botActions)) {
      console.error('botActions is not an array');
      return false;
    }

    // Check if we have the right number of bot actions
    if (decision.botActions.length !== gameData.botStacks.length) {
      console.error(`botActions length (${decision.botActions.length}) does not match bot count (${gameData.botStacks.length})`);
      return false;
    }

    // Validate each bot action
    for (let i = 0; i < decision.botActions.length; i++) {
      const action = decision.botActions[i];
      if (!this.isValidBotAction(action, gameData.legalActions)) {
        console.error(`Invalid bot action at index ${i}:`, action);
        return false;
      }

      // Ensure botIndex matches expected position
      if (action.botIndex !== i) {
        console.error(`Bot index mismatch: expected ${i}, got ${action.botIndex}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validates a single bot action
   * @param {Object} action - The bot action object
   * @param {Array} legalActions - Available legal actions
   * @returns {boolean} True if valid
   */
  isValidBotAction(action, legalActions) {
    if (!action || typeof action !== 'object') {
      return false;
    }

    if (typeof action.botIndex !== 'number' || action.botIndex < 0) {
      return false;
    }

    if (typeof action.confidence !== 'number' || action.confidence < 0 || action.confidence > 1) {
      return false;
    }

    const validBiases = ['fold', 'call', 'raise'];
    if (!validBiases.includes(action.actionBias)) {
      return false;
    }

    // Also validate against legal actions if provided
    if (legalActions && !Array.isArray(legalActions)) {
      // If legalActions is not an array, we can't validate against it
      return true;
    }

    if (legalActions && !legalActions.includes(action.actionBias)) {
      return false;
    }

    return true;
  }

  /**
   * Maps AI intent (actionBias, aggression, bluffFrequency) into concrete poker actions
   * @param {Object} aiDecision - The AI decision object
   * @param {Object} gameState - The current game state
   * @returns {Array} Array of concrete actions for each bot
   */
  mapIntentToActions(aiDecision, gameState) {
    const { botActions } = aiDecision;
    const concreteActions = [];

    for (const botAction of botActions) {
      const concreteAction = this.determineConcreteAction(botAction, gameState, aiDecision);
      concreteActions.push(concreteAction);
    }

    return concreteActions;
  }

  /**
   * Determines the concrete action for a single bot based on AI intent
   * @param {Object} botAction - The bot-specific action bias from AI
   * @param {Object} gameState - The current game state
   * @param {Object} aiDecision - Full AI decision object
   * @returns {Object} Concrete action for the bot
   */
  determineConcreteAction(botAction, gameState, aiDecision) {
    // The game engine is authoritative, so we respect legal actions
    const { actionBias, confidence } = botAction;
    const legalActions = gameState.legalActions;

    if (!Array.isArray(legalActions) || legalActions.length === 0) {
      // If no legal actions specified, default to safe action
      return {
        botIndex: botAction.botIndex,
        action: "call",
        confidence: 0.5
      };
    }

    // If the suggested action is legal, use it with appropriate confidence
    if (legalActions.includes(actionBias)) {
      return {
        botIndex: botAction.botIndex,
        action: actionBias,
        confidence: confidence
      };
    }

    // If not legal, pick the closest legal action based on game context
    // Consider the pot odds, player difficulty, and game state
    const difficulty = gameState.difficulty || 'NORMAL';
    const potSize = gameState.potSize || 100;
    const playerAction = gameState.playerAction || 'call';
    const playerBetSize = gameState.playerBetSize || 0;

    if (actionBias === 'raise' && legalActions.includes('call')) {
      // If raise isn't legal but call is, consider calling based on difficulty
      if (difficulty === 'HARD' && Math.random() > 0.3) {
        // HARD mode bots might still call with high confidence
        return {
          botIndex: botAction.botIndex,
          action: 'call',
          confidence: Math.min(confidence, 0.9)
        };
      } else {
        // Other difficulties will call with appropriate confidence
        return {
          botIndex: botAction.botIndex,
          action: 'call',
          confidence: Math.min(confidence, 0.8)
        };
      }
    } else if (actionBias === 'raise' && legalActions.includes('fold')) {
      // If raise isn't legal and only fold is available, use pot odds to decide
      if (difficulty === 'HARD' && playerBetSize < potSize * 0.5) {
        // HARD mode might call smaller bets relative to pot size
        if (legalActions.includes('call')) {
          return {
            botIndex: botAction.botIndex,
            action: 'call',
            confidence: Math.min(confidence, 0.7)
          };
        }
      }
      // Otherwise fold with appropriate confidence
      return {
        botIndex: botAction.botIndex,
        action: 'fold',
        confidence: Math.max(confidence, 0.3)
      };
    } else if (actionBias === 'call' && legalActions.includes('fold')) {
      // If call isn't legal but fold is
      if (difficulty === 'HARD' && playerBetSize < potSize * 0.3) {
        // HARD mode might still try to call small bets if possible
        if (legalActions.includes('call')) {
          return {
            botIndex: botAction.botIndex,
            action: 'call',
            confidence: Math.min(confidence, 0.8)
          };
        }
      }
      // Otherwise fold
      return {
        botIndex: botAction.botIndex,
        action: 'fold',
        confidence: Math.max(confidence, 0.4)
      };
    } else if (actionBias === 'fold' && legalActions.includes('call')) {
      // If fold is suggested but calling is possible
      if (difficulty === 'HARD' && playerBetSize < potSize * 0.4) {
        // HARD mode bots might call with smaller bets relative to pot
        return {
          botIndex: botAction.botIndex,
          action: 'call',
          confidence: Math.max(confidence, 0.6)
        };
      } else if (difficulty === 'EASY') {
        // EASY mode respects fold suggestion more
        return {
          botIndex: botAction.botIndex,
          action: 'fold',
          confidence: confidence
        };
      }
    }

    // Fallback: just pick the first legal action
    return {
      botIndex: botAction.botIndex,
      action: legalActions[0],
      confidence: 0.5
    };
  }

  /**
   * Main method to get the AI decision for the current game state
   * @param {Object} gameState - The current game state
   * @returns {Promise<Array>} Array of concrete actions for all bots
   */
  async getAIActions(gameState) {
    try {
      // Validate game state
      if (!gameState || typeof gameState !== 'object') {
        throw new Error('Invalid game state provided to AI decision');
      }

      // Build the user prompt from the game state
      const gameData = this.buildUserPrompt(gameState);

      // Call the nscale API to get the AI decision
      const apiResponse = await this.callNscaleAPI(gameData);

      // Parse and validate the response
      const validatedDecision = this.parseAndValidateResponse(apiResponse, gameData);

      // Map AI intent to concrete actions
      const concreteActions = this.mapIntentToActions(validatedDecision, gameState);

      return concreteActions;
    } catch (error) {
      console.error('Error in AI decision process:', error);

      // Fallback to simple balanced strategy
      return this.generateFallbackActions(gameState);
    }
  }

  /**
   * Generates fallback actions when the main process fails
   * @param {Object} gameState - The current game state
   * @returns {Array} Array of fallback actions
   */
  generateFallbackActions(gameState) {
    if (!gameState) {
      return [];
    }

    const { botStacks, legalActions } = gameState;

    if (!Array.isArray(botStacks)) {
      return [];
    }

    const fallbackActions = [];

    for (let i = 0; i < botStacks.length; i++) {
      const action = legalActions && legalActions.length > 0
        ? legalActions.includes('call') ? 'call' : legalActions[0]
        : 'call';

      fallbackActions.push({
        botIndex: i,
        action,
        confidence: 0.5
      });
    }

    return fallbackActions;
  }

  /**
   * Gets AI performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Resets AI performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0
    };
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PokerAIDecision;
} else if (typeof window !== 'undefined') {
  window.PokerAIDecision = PokerAIDecision;
}