import React from 'react';

/**
 * Profile Image Component that uses initials to avoid Google rate limiting
 * 
 * @param {Object} props - Component props
 * @param {string} props.profilePicture - URL to profile picture (not used due to rate limiting)
 * @param {string} props.userName - User's name to extract initial from
 * @returns {JSX.Element} Profile image component
 */
const ProfileImage = ({ profilePicture, userName }) => {
  // Always use initials avatar to avoid Google rate limiting issues
  return (
    <div 
      className="h-8 w-8 sm:h-9 sm:w-9 md:h-9 md:w-9 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-base text-indigo-700 dark:text-indigo-300 font-semibold border-2 border-indigo-500 dark:border-indigo-500 shadow-lg"
      style={{ minWidth: '32px' }}
      title={userName}
    >
      {userName?.charAt(0) || 'U'}
    </div>
  );
};

export default ProfileImage; 