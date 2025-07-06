// middleware/cors.js
import cors from 'cors';

// CORS configuration with origin checking and credentials support
export const configureCors = () => {
  return cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if(!origin) return callback(null, true);
      
      // Allow frontend origins during development
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173'
      ];
      
      if(allowedOrigins.indexOf(origin) === -1){
        return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      }
      
      return callback(null, true);
    },
    credentials: true
  });
};