import { GoogleGenAI, Modality } from '@google/genai';
import 'dotenv/config'; // To load GOOGLE_API_KEY from .env file

// Ensure you have GOOGLE_API_KEY in a .env file or as an environment variable
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("ERROR: GOOGLE_API_KEY not found in environment variables or .env file.");
  console.log("Please create a .env file in the same directory with GOOGLE_API_KEY=YOUR_API_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.0-flash-live-001';

// Configure tools to ONLY include urlContext
const tools = [{ urlContext: {} }];
// To test with Google Search also available (like your backend now):
// const tools = [{ urlContext: {} }, { googleSearch: {} }];

const config = {
  responseModalities: [Modality.TEXT], // Expecting text responses
  tools: tools,
};

async function runLiveUrlContextTest() {
  console.log(`Attempting to connect to model: ${model}`);
  console.log('With configuration:', JSON.stringify(config, null, 2));
  console.log('---');

  let session; // Declare session here so it's in scope for onmessage's close

  try {
    session = await ai.live.connect({ // Assign to the session variable
      model: model,
      config: config,
      callbacks: {
        onopen: function () {
          console.log('SESSION OPENED');
          // The session object might not be fully assigned to the outer 'session' variable yet
          // when onopen is called. It's safer to send content after ai.live.connect resolves.
        },
        onmessage: function (message) {
          console.log('--------------------');
          console.log('RECEIVED MESSAGE:');
          console.log(JSON.stringify(message, null, 2)); // Log the entire message structure

          // Specific checks for interesting parts
          if (message.serverContent) {
            if (message.serverContent.url_context_metadata) {
              console.log('\n!!! DETECTED URL_CONTEXT_METADATA (in serverContent):', JSON.stringify(message.serverContent.url_context_metadata, null, 2));
            }
            if (message.serverContent.modelTurn && message.serverContent.modelTurn.parts) {
              message.serverContent.modelTurn.parts.forEach((part, index) => {
                console.log(`\n--- Part ${index} of Model Turn ---`);
                if (part.text) {
                  console.log('Text:', part.text);
                }
                if (part.executableCode) {
                  console.log('Executable Code Detected:');
                //   console.log('  Language:', part.executableCode.language);
                  console.log('  Code:\n', part.executableCode.code);
                }
                if (part.codeExecutionResult) {
                  console.log('Code Execution Result Detected:');
                //   console.log('  Outcome:', part.codeExecutionResult.outcome);
                  console.log('  Output:\n', part.codeExecutionResult.output);
                }
              });
            }
            if (message.serverContent.turnComplete) {
              console.log('\nTURN COMPLETE. Closing session.');
              // 'session' from the outer scope should be initialized by the time 'onmessage' is called.
              if (session) session.close();
            }
          }
          
          // Check for top-level urlContextMetadata (less likely based on schema but good to check)
          if (message.urlContextMetadata) {
             console.log('\n!!! DETECTED URL_CONTEXT_METADATA (top-level):', JSON.stringify(message.urlContextMetadata, null, 2));
          }

          // Check for tool calls (e.g., if it tries urlContext.get_heading)
          if (message.toolCall) {
            console.log('\n--- TOOL CALL DETECTED ---');
            console.log(JSON.stringify(message.toolCall, null, 2));
          }
          console.log('--------------------');
        },
        onerror: function (e) {
          console.error('\nSESSION ERROR:', e.message, e);
        },
        onclose: function (e) {
          console.log('\nSESSION CLOSED:', e ? e.reason : 'No reason provided');
        },
      },
    });

    // Now 'session' is guaranteed to be initialized.
    // Send the initial prompt.
    const prompt = "Go to https://www.google.com and tell me what the main heading or title of the page is.";
    console.log(`\nSENDING PROMPT: "${prompt}"\n`);
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text: prompt }] }] });

  } catch (error) {
    console.error('Failed to initiate or use live session:', error);
    if (session) {
      session.close(); // Attempt to close session on error too
    }
  }
}

async function main() {
  await runLiveUrlContextTest();
}

main();