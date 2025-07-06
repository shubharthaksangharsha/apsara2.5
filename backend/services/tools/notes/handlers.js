// services/tools/notes/handlers.js
/**
 * Saves a note to the notes file
 */
export async function handleTakeNotes({ content, title }) {
    if (!content) {
      return { 
        status: 'error', 
        message: 'Note content is required.' 
      };
    }
    
    console.log(`[Tool: takeNotes] Saving note${title ? ` titled "${title}"` : ''}`);
    
    try {
      // Format the note with timestamp and title if provided
      const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      const formattedNote = `\n\n--- ${timestamp} ${title ? `- ${title}` : ''} ---\n${content}`;
      
      // Use Python to append the note to the file
      const pythonCode = `
import os

# File to save notes to
notes_file = 'my-imp-notes.txt'

# Note content to append
note_content = """${formattedNote}"""

# Create the file if it doesn't exist or append to it
with open(notes_file, 'a+') as f:
    f.write(note_content)

# Verify file exists and get its size
file_exists = os.path.exists(notes_file)
file_size = os.path.getsize(notes_file) if file_exists else 0

print(f"Note saved successfully to {notes_file}. File size: {file_size} bytes.")
`;
  
      // Run the Python code
      const { spawn } = await import('child_process');
      const pythonProcess = spawn('python3', ['-c', pythonCode]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0 || errorOutput) {
            console.error(`[Tool: takeNotes] Error executing Python (Code: ${code}): ${errorOutput}`);
            resolve({
              status: 'error',
              message: `Failed to save note: ${errorOutput || `Exit code ${code}`}`
            });
          } else {
            console.log(`[Tool: takeNotes] Python output: ${output}`);
            resolve({
              status: 'success',
              message: `Note ${title ? `titled "${title}" ` : ''}saved successfully to my-imp-notes.txt`,
              action: 'notesSaved',
              output: output.trim()
            });
          }
        });
      });
    } catch (error) {
      console.error(`[Tool: takeNotes] Error: ${error.message}`);
      return {
        status: 'error',
        message: `Failed to save note: ${error.message}`
      };
    }
  }
  
  /**
   * Loads notes from the notes file
   */
  export async function handleLoadNotes({ limit }) {
    console.log(`[Tool: loadNotes] Loading notes${limit ? ` (limit: ${limit})` : ''}`);
    
    try {
      // Use Python to read the notes file
      const pythonCode = `
import os
import json
import time
from datetime import datetime

# File to read notes from
notes_file = 'my-imp-notes.txt'

# Check if file exists
if not os.path.exists(notes_file):
    print(json.dumps({
        "status": "error",
        "message": "No saved notes found. Use the takeNotes tool to save notes first."
    }))
    exit(0)

# Read the file content
with open(notes_file, 'r') as f:
    content = f.read()

# Get file stats
file_stats = os.stat(notes_file)
file_size = file_stats.st_size
last_modified = file_stats.st_mtime

# Extract notes by splitting on the timestamp markers
# Each note starts with "--- YYYY-MM-DD HH:MM:SS"
notes = []
if content.strip():
    # Split by the marker pattern
    import re
    note_pattern = r'---\\s+(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2})(?:\\s+-\\s+(.+?))?\\s+---\\n([\\s\\S]+?)(?=\\n\\n---\\s+\\d{4}|$)'
    matches = re.findall(note_pattern, content)
    
    for match in matches:
        timestamp, title, note_content = match
        notes.append({
            "timestamp": timestamp,
            "title": title.strip() if title else None,
            "content": note_content.strip()
        })

# Reverse so newest are first
notes.reverse()

# Apply limit if specified
limit_val = ${limit || 'None'}
if limit_val is not None and limit_val > 0:
    notes = notes[:limit_val]

# Prepare result
result = {
    "status": "success",
    "notes": notes,
    "total_notes": len(notes),
    "file_size": file_size,
    "last_modified": datetime.fromtimestamp(last_modified).isoformat()
}

print(json.dumps(result))
`;
  
      // Run the Python code
      const { spawn } = await import('child_process');
      const pythonProcess = spawn('python3', ['-c', pythonCode]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0 || errorOutput) {
            console.error(`[Tool: loadNotes] Error executing Python (Code: ${code}): ${errorOutput}`);
            resolve({
              status: 'error',
              message: `Failed to load notes: ${errorOutput || `Exit code ${code}`}`
            });
          } else {
            console.log(`[Tool: loadNotes] Python output: ${output}`);
            try {
              const result = JSON.parse(output.trim());
              resolve({
                ...result,
                action: 'notesLoaded'
              });
            } catch (parseError) {
              console.error(`[Tool: loadNotes] Error parsing Python output: ${parseError}`);
              resolve({
                status: 'error',
                message: `Failed to parse notes data: ${parseError.message}`
              });
            }
          }
        });
      });
    } catch (error) {
      console.error(`[Tool: loadNotes] Error: ${error.message}`);
      return {
        status: 'error',
        message: `Failed to load notes: ${error.message}`
      };
    }
  }
  
  export const notesToolHandlers = {
    takeNotes: handleTakeNotes,
    loadNotes: handleLoadNotes
  };