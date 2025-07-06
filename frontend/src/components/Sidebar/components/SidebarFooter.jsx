import React from 'react';
import { UserIcon } from 'lucide-react';
import { ANIMATION_DURATION } from '../constants';

/**
 * Footer component for the sidebar with developer credit
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.sidebarLocked - Whether sidebar is locked in expanded state
 * @returns {JSX.Element} Sidebar footer component
 */
const SidebarFooter = ({ sidebarLocked }) => {
  return (
    <div className="flex-shrink-0 mt-auto border-t border-gray-200 dark:border-gray-700 p-4">
      <a
        href="https://shubharthaksangharsha.github.io/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 group/footer text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300"
      >
        {/* Shimmering Background Div */}
        <div
          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-1 ring-inset ring-gray-300 dark:ring-gray-600 flex-shrink-0 transition-colors group-hover/footer:ring-indigo-500 animate-shimmer relative overflow-hidden"
          style={{
            animationDuration: ANIMATION_DURATION,
            '--shimmer-color': 'rgba(255,255,255,0.1)',
            '--shimmer-color-dark': 'rgba(0,0,0,0.1)'
          }}
        >
          {/* UserIcon - Apply drop shadow for glow effect */}
          <UserIcon
            className="
              h-4 w-4 text-indigo-500 dark:text-indigo-400            /* Keep base color */
              transition-all duration-300 ease-in-out                /* Smooth transitions */
              drop-shadow-[0_1px_2px_rgba(129,140,248,0.7)]          /* Base indigo glow (light) */
              dark:drop-shadow-[0_1px_2px_rgba(165,180,252,0.6)]       /* Base indigo glow (dark) */
              group-hover/footer:scale-110                           /* Scale on hover */
              group-hover/footer:drop-shadow-[0_2px_5px_rgba(129,140,248,0.9)]  /* Enhanced indigo glow on hover (light) */
              dark:group-hover/footer:drop-shadow-[0_2px_5px_rgba(165,180,252,0.8)] /* Enhanced indigo glow on hover (dark) */
            "
          />
        </div>
        <div className={`
          flex flex-col transition-opacity duration-300
          ${sidebarLocked ? 'lg:opacity-100' : 'lg:opacity-0 group-hover:lg:opacity-100'}
        `}>
          <span className="text-xs whitespace-nowrap">Developed by</span>
          <span className="text-sm font-medium whitespace-nowrap">Shubharthak</span>
        </div>
      </a>
    </div>
  );
};

export default SidebarFooter;
