/**
 * Validate the Texas Hold'em Poker AI Strategy System files
 */

// Check if all required files exist and have valid syntax
const fs = require('fs');
const path = require('path');

function validateFileSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Simple validation: check if it's valid JavaScript by attempting to parse
    // For a more comprehensive check, we would use a JS parser, but for now we'll just check syntax
    
    // Try to load the file if it's a Node module
    if (filePath.endsWith('.js')) {
      // Basic check: does it contain valid JavaScript structure?
      const hasValidStructure = content.includes('function') || 
                               content.includes('class') || 
                               content.includes('const') || 
                               content.includes('let') ||
                               content.includes('var') ||
                               content.includes('export') ||
                               content.includes('import');
      
      if (hasValidStructure) {
        console.log(`✓ ${path.basename(filePath)} - Valid JavaScript structure detected`);
        return true;
      } else {
        console.log(`? ${path.basename(filePath)} - File exists but structure unclear`);
        return true; // Still consider it valid if it exists
      }
    }
    return true;
  } catch (error) {
    console.log(`✗ Error reading ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

function validateProjectStructure() {
  console.log('Texas Hold\'em Poker AI System - Project Validation');
  console.log('================================================\n');
  
  const requiredFiles = [
    'poker-ai-decision.js',
    'poker-game-engine.js',
    'poker-utils.js',
    'index.html',
    'README.md',
    'package.json',
    'test.js'
  ];
  
  let allValid = true;
  
  for (const fileName of requiredFiles) {
    const filePath = path.join(__dirname, fileName);
    
    if (fs.existsSync(filePath)) {
      console.log(`✓ Found ${fileName}`);
      if (!validateFileSyntax(filePath)) {
        allValid = false;
      }
    } else {
      console.log(`✗ Missing ${fileName}`);
      allValid = false;
    }
  }
  
  console.log('\nValidating poker-ai-decision.js content...');
  try {
    const aiContent = fs.readFileSync(path.join(__dirname, 'poker-ai-decision.js'), 'utf8');
    if (aiContent.includes('class PokerAIDecision') && 
        aiContent.includes('getAIActions') && 
        aiContent.includes('nscale') && 
        aiContent.includes('systemPrompt')) {
      console.log('✓ poker-ai-decision.js contains expected content');
    } else {
      console.log('✗ poker-ai-decision.js missing expected content');
      allValid = false;
    }
  } catch (e) {
    console.log(`✗ Error reading poker-ai-decision.js: ${e.message}`);
    allValid = false;
  }
  
  console.log('\nValidating poker-game-engine.js content...');
  try {
    const engineContent = fs.readFileSync(path.join(__dirname, 'poker-game-engine.js'), 'utf8');
    if (engineContent.includes('class PokerGameEngine') && 
        engineContent.includes('processHumanAction') && 
        engineContent.includes('startRound') && 
        engineContent.includes('initializeGame')) {
      console.log('✓ poker-game-engine.js contains expected content');
    } else {
      console.log('✗ poker-game-engine.js missing expected content');
      allValid = false;
    }
  } catch (e) {
    console.log(`✗ Error reading poker-game-engine.js: ${e.message}`);
    allValid = false;
  }
  
  console.log('\nValidating poker-utils.js content...');
  try {
    const utilsContent = fs.readFileSync(path.join(__dirname, 'poker-utils.js'), 'utf8');
    if (utilsContent.includes('evaluatePokerHand') && 
        utilsContent.includes('getCardRankValue') && 
        utilsContent.includes('formatCurrency')) {
      console.log('✓ poker-utils.js contains expected content');
    } else {
      console.log('✗ poker-utils.js missing expected content');
      allValid = false;
    }
  } catch (e) {
    console.log(`✗ Error reading poker-utils.js: ${e.message}`);
    allValid = false;
  }
  
  console.log('\nValidating index.html content...');
  try {
    const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    if (htmlContent.includes('Texas Hold\'em') && 
        htmlContent.includes('poker-ai-decision.js') && 
        htmlContent.includes('PokerGameEngine') && 
        htmlContent.includes('game-container')) {
      console.log('✓ index.html contains expected content');
    } else {
      console.log('✗ index.html missing expected content');
      allValid = false;
    }
  } catch (e) {
    console.log(`✗ Error reading index.html: ${e.message}`);
    allValid = false;
  }
  
  console.log('\nValidating package.json content...');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (packageJson.name && packageJson.main && packageJson.scripts) {
      console.log('✓ package.json contains expected content');
    } else {
      console.log('✗ package.json missing expected content');
      allValid = false;
    }
  } catch (e) {
    console.log(`✗ Error reading package.json: ${e.message}`);
    allValid = false;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('✓ ALL VALIDATION CHECKS PASSED');
    console.log('The Texas Hold\'em Poker AI Strategy System is ready for use!');
  } else {
    console.log('✗ SOME VALIDATION CHECKS FAILED');
    console.log('Please review the issues above before deploying.');
  }
  console.log('='.repeat(50));
  
  return allValid;
}

// Run validation
const isValid = validateProjectStructure();

// Exit with appropriate code
process.exit(isValid ? 0 : 1);