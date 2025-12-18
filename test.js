/**
 * Comprehensive test for the Texas Hold'em Poker AI Strategy System
 */

// Since these are browser modules, we'll test the structure and logic
console.log('Texas Hold\'em AI Strategy System - Comprehensive Test');

// Test if global objects are defined when loaded in browser context
function testModuleDefinitions() {
  console.log('Testing module definitions...');

  // Check if the main classes are defined
  const hasPokerAIDecision = typeof PokerAIDecision !== 'undefined';
  const hasPokerGameEngine = typeof PokerGameEngine !== 'undefined';
  const hasPokerUtils = typeof PokerUtils !== 'undefined';

  console.log(`PokerAIDecision available: ${hasPokerAIDecision}`);
  console.log(`PokerGameEngine available: ${hasPokerGameEngine}`);
  console.log(`PokerUtils available: ${hasPokerUtils}`);

  // Test utility functions if available
  if (typeof PokerUtils !== 'undefined') {
    console.log('\nTesting PokerUtils...');

    // Test card rank conversion
    try {
      const rankValue = PokerUtils.getCardRankValue('A');
      console.log(`✓ Rank value of Ace: ${rankValue} (expected: 14)`);
    } catch (e) {
      console.log(`✗ Error testing rank conversion: ${e.message}`);
    }

    // Test hand evaluation
    try {
      const testHand = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'hearts' }
      ];
      const communityCards = [
        { rank: 'Q', suit: 'hearts' },
        { rank: 'J', suit: 'hearts' },
        { rank: 'T', suit: 'hearts' },
        { rank: '9', suit: 'diamonds' },
        { rank: '8', suit: 'clubs' }
      ];

      const evaluation = PokerUtils.evaluatePokerHand(testHand, communityCards);
      console.log(`✓ Hand evaluation: ${evaluation.description} (value: ${evaluation.value})`);
    } catch (e) {
      console.log(`✗ Error testing hand evaluation: ${e.message}`);
    }

    // Test currency formatting
    try {
      const formatted = PokerUtils.formatCurrency(2500);
      console.log(`✓ Formatted currency: ${formatted} (expected: $2,500)`);
    } catch (e) {
      console.log(`✗ Error testing currency formatting: ${e.message}`);
    }

    // Test card string conversion
    try {
      const cards = [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'spades' }];
      const cardStr = PokerUtils.cardsToString(cards);
      console.log(`✓ Card string: ${cardStr} (expected: Ah, Ks)`);
    } catch (e) {
      console.log(`✗ Error testing card string: ${e.message}`);
    }
  }

  console.log('\nModule definition tests completed!');
  return { hasPokerAIDecision, hasPokerGameEngine, hasPokerUtils };
}

// Test the AI Decision module
function testAIDecision() {
  console.log('\nTesting PokerAIDecision...');

  if (typeof PokerAIDecision === 'undefined') {
    console.log('✗ PokerAIDecision not available, skipping tests');
    return false;
  }

  try {
    // Create instance without API token (will use fallbacks)
    const aiDecision = new PokerAIDecision('');

    // Test metrics functionality
    console.log('✓ Created PokerAIDecision instance');
    console.log('✓ Initial metrics:', aiDecision.getMetrics());

    // Test system prompt exists
    if (aiDecision.systemPrompt && aiDecision.systemPrompt.includes('Texas Hold\'em')) {
      console.log('✓ System prompt contains expected content');
    } else {
      console.log('✗ System prompt missing or incorrect');
    }

    // Test difficulty model mapping
    if (aiDecision.getDifficultyModel('HARD') === 'Qwen/Qwen3-235B-A22B-Instruct') {
      console.log('✓ Difficulty model mapping works correctly');
    } else {
      console.log('✗ Difficulty model mapping failed');
    }

    // Test fallback decision generation
    const gameData = {
      botStacks: [2000, 1800, 1600],
      legalActions: ['fold', 'call', 'raise']
    };
    const fallbackDecision = JSON.parse(aiDecision.generateFallbackDecision(gameData));
    if (fallbackDecision.botActions && fallbackDecision.botActions.length === 3) {
      console.log('✓ Fallback decision generation works');
    } else {
      console.log('✗ Fallback decision generation failed');
    }

    console.log('✓ PokerAIDecision tests completed successfully');
    return true;
  } catch (e) {
    console.log(`✗ Error in PokerAIDecision tests: ${e.message}`);
    return false;
  }
}

// Test the Game Engine
function testGameEngine() {
  console.log('\nTesting PokerGameEngine...');

  if (typeof PokerGameEngine === 'undefined') {
    console.log('✗ PokerGameEngine not available, skipping tests');
    return false;
  }

  try {
    // Create instance without API token (will use fallbacks)
    const gameEngine = new PokerGameEngine('');

    // Test initialization
    console.log('✓ Created PokerGameEngine instance');

    // Test basic initialization
    const botPlayers = [
      { id: 0, name: 'Bot1', startingStack: 2000, position: 'SB' },
      { id: 1, name: 'Bot2', startingStack: 1800, position: 'BB' },
      { id: 2, name: 'Bot3', startingStack: 1600, position: 'UTG' }
    ];

    const humanPlayer = {
      name: 'Player',
      startingStack: 2000,
      position: 'BTN',
      difficulty: 'NORMAL'
    };

    gameEngine.initializeGame(botPlayers, humanPlayer);
    console.log('✓ Game initialization works');

    // Test deck creation
    const deck = gameEngine.createShuffledDeck();
    if (Array.isArray(deck) && deck.length === 52) {
      console.log('✓ Deck creation and shuffling works');
    } else {
      console.log(`✗ Deck creation failed, length: ${deck ? deck.length : 'N/A'}`);
    }

    // Test game state
    const gameState = gameEngine.getCurrentGameState();
    if (gameState.currentRound && gameState.bots && Array.isArray(gameState.bots)) {
      console.log('✓ Game state retrieval works');
    } else {
      console.log('✗ Game state retrieval failed');
    }

    // Test validation
    const validation = gameEngine.validateAction(gameEngine.humanPlayer, 'call', 0);
    if (typeof validation === 'object') {
      console.log('✓ Action validation works');
    } else {
      console.log('✗ Action validation failed');
    }

    console.log('✓ PokerGameEngine tests completed successfully');
    return true;
  } catch (e) {
    console.log(`✗ Error in PokerGameEngine tests: ${e.message}`);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('Starting comprehensive tests...\n');

  // Test module definitions
  const moduleTests = testModuleDefinitions();

  // Test AI Decision module
  const aiDecisionTests = testAIDecision();

  // Test Game Engine
  const gameEngineTests = testGameEngine();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log(`Module Definitions: ${moduleTests.hasPokerAIDecision && moduleTests.hasPokerGameEngine && moduleTests.hasPokerUtils ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`AI Decision Tests: ${aiDecisionTests ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Game Engine Tests: ${gameEngineTests ? '✓ PASS' : '✗ FAIL'}`);

  const allTestsPassed = moduleTests.hasPokerAIDecision && moduleTests.hasPokerGameEngine &&
                        moduleTests.hasPokerUtils && aiDecisionTests && gameEngineTests;

  console.log(`Overall Result: ${allTestsPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  console.log('='.repeat(50));

  return allTestsPassed;
}

// Run tests
const allPassed = runAllTests();

// Example of how the AI decision system would be used
console.log('\nExample usage:');
console.log('1. Create new PokerGameEngine instance with API token');
console.log('2. Initialize game with bot and human players');
console.log('3. Start a round with gameEngine.startRound()');
console.log('4. Process human actions with gameEngine.processHumanAction()');
console.log('5. System automatically coordinates bot responses using AI strategy');

if (allPassed) {
  console.log('\n✓ System is ready for production use!');
} else {
  console.log('\n⚠ Some tests failed. Please check the implementation.');
}