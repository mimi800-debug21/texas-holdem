# Texas Hold'em Poker AI Strategy System - Production Ready

This project implements a centralized Texas Hold'em poker strategy AI that coordinates all bot players to provide challenging and strategic gameplay. The system has been enhanced for production use with a user-friendly interface and robust error handling.

## Overview

The system consists of three main components:

1. **AI Decision Module** (`poker-ai-decision.js`): Implements the core AI strategy logic that makes centralized decisions for all bot players.

2. **Game Engine Interface** (`poker-game-engine.js`): Connects the poker game mechanics to the AI decision system.

3. **Utilities** (`poker-utils.js`): Provides helper functions for poker game mechanics.

4. **User Interface** (`index.html`): Production-ready interface with difficulty selection, visual poker table, and comprehensive game logs.

## Enhanced Features

- **Improved UI**: Modern, responsive poker table interface with card visualization
- **Difficulty Selection**: Easy, Normal, and Hard difficulty levels with visual indicators
- **Real-time Game Logs**: Separate panels for AI actions and hand history
- **Player Status Tracking**: Visual indicators for each player's status and stack
- **Community Cards Display**: Clear visualization of flop, turn, and river cards
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during AI processing
- **Production Ready**: Fully styled, responsive design for all screen sizes

## Architecture

### AI Strategy System

The system uses the nscale API to run a Qwen-based LLM that generates strategic intent for all bots:

```
Game State → AI Prompt → nscale API → Strategic Decisions → Action Mapping → Poker Actions
```

#### Output Format
Each AI decision follows this strict JSON format:
```json
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
```

### Difficulty Levels

- **EASY**: Loose play, low coordination, frequent mistakes
- **NORMAL**: Balanced strategy, moderate coordination, occasional bluffs
- **HARD**: Highly coordinated, aggressive exploitation, pressure-focused

## Files

- `poker-ai-decision.js`: Core AI decision logic
- `poker-game-engine.js`: Game engine interface
- `poker-utils.js`: Poker utilities
- `index.html`: Production-ready user interface
- `README.md`: Documentation
- `package.json`: Project configuration
- `test.js`: Test utilities

## Setup

1. The API key is already included in `index.html` from `api-key.txt`
2. Host the files on a web server to avoid CORS issues when calling the API
3. For development: `npm install` to install dependencies, `npm start` to serve

## Usage

The system provides an intuitive interface:
1. Select difficulty level (Easy, Normal, Hard)
2. Click "Deal New Hand" to start a new poker hand
3. Play your cards using Fold, Call, or Raise
4. Watch as AI bots respond with coordinated strategies
5. Advance through betting rounds (Flop, Turn, River)
6. Review AI actions and hand history in the log panels

## Key Constraints

- AI does NOT calculate odds or see hidden cards
- AI provides strategic intent ONLY, not concrete actions
- Game engine remains authoritative for all decisions
- Bots may cooperate and share strategic intent
- No illegal information usage or cheating

## API Integration

The system calls the nscale inference API with:
- Different models based on difficulty level
- Tuned temperatures for different playstyles
- Proper error handling and fallbacks

## Error Handling

- Invalid AI responses trigger fallback strategies
- API failures result in conservative default actions
- Validation ensures only legal actions are taken
- Safe fallbacks maintain game continuity
- User-friendly error messages for all failure scenarios

## Browser Compatibility

The implementation works in modern browsers and follows ES6 standards with responsive design for mobile and desktop.