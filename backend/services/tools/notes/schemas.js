// services/tools/notes/schemas.js
export const takeNotesSchema = {
    name: 'takeNotes',
    description: 'Saves user notes to a file. The notes will be saved to "my-imp-notes.txt" for future reference.',
    parameters: {
      type: 'OBJECT',
      properties: {
        content: { 
          type: 'STRING', 
          description: 'The content of the note to save. Can include any text, including code snippets, lists, etc.' 
        },
        title: { 
          type: 'STRING', 
          description: 'Optional. A title or header for the note.' 
        }
      },
    }
  };
  
  export const loadNotesSchema = {
    name: 'loadNotes',
    description: 'Loads previously saved notes from the notes file.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { 
          type: 'NUMBER', 
          description: 'Optional. Maximum number of notes to retrieve. Defaults to all notes.' 
        }
      }
    }
  };
  
  export const notesToolSchemas = [
    takeNotesSchema,
    loadNotesSchema
  ];