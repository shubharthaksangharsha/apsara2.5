// services/google/gmail/index.js
import { gmailToolSchemas } from './schemas.js';
import { gmailToolHandlers } from './handlers.js';
import { emailAliases, resolveEmailAlias } from './aliases.js';

export {
  gmailToolSchemas,
  gmailToolHandlers,
  emailAliases,
  resolveEmailAlias
};