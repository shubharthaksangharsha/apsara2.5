import React from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { PREVIEW_STATUS } from '../constants';

/**
 * Component to display a preview thumbnail of an image attachment
 * 
 * @param {Object} props - Component props
 * @param {Object} props.file - File data object
 * @param {Function} props.onRemove - Handler for removing the file
 * @param {string} props.status - Current upload status (pending, uploading, success, error)
 * @returns {JSX.Element} Image preview item component
 */
export default function ImagePreviewItem({ file, onRemove, status }) {
  const [previewSrc, setPreviewSrc] = React.useState('');

  React.useEffect(() => {
    let objectUrl = null;
    // If 'file' is a File object (typically before or during upload)
    // or if it's an object that was a File and now has upload details but no direct public URI for preview
    if (file instanceof File) {
      objectUrl = URL.createObjectURL(file);
      setPreviewSrc(objectUrl);
    } else if (file.uri && !file.type?.startsWith('image/')) {
      // This case is if file.uri is present but it's not a direct image link (e.g. Google API URI)
      // and we don't have the original File object anymore. We might not be able to show a preview.
      setPreviewSrc(''); // Or a placeholder indicating no preview available
    } else if (file.previewUrl) {
      // If we explicitly pass a previewUrl (e.g., from a successfully uploaded and processed image)
      setPreviewSrc(file.previewUrl);
    }

    // Cleanup function
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, file.name, file.size, file.uri, file.previewUrl]); // Depend on specific properties that might change

  let statusIndicator = null;
  let statusTooltip = '';

  if (status === PREVIEW_STATUS.UPLOADING) {
    statusIndicator = (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-md">
        <Loader2 size={20} className="text-white animate-spin" />
      </div>
    );
    statusTooltip = 'Uploading...';
  } else if (status === PREVIEW_STATUS.ERROR) {
    statusIndicator = (
      <div className="absolute inset-0 flex items-center justify-center bg-red-600 bg-opacity-70 rounded-md">
        <AlertTriangle size={20} className="text-white" />
      </div>
    );
    statusTooltip = 'Upload failed';
  } else if (status === PREVIEW_STATUS.SUCCESS && file.id) { 
    statusIndicator = (
      <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-0.5">
        <CheckCircle size={10} className="text-white" />
      </div>
    );
    statusTooltip = 'Uploaded';
  }

  return (
    <div 
      className="relative inline-block h-20 w-20 sm:h-24 sm:w-24 border border-gray-300 dark:border-gray-500 rounded-md overflow-hidden flex-shrink-0 shadow hover:shadow-lg transition-shadow duration-150 ease-in-out group"
      title={statusTooltip || file.name}
    >
      {previewSrc ? (
        <img 
          src={previewSrc} 
          alt={file.name || 'Image preview'} 
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-gray-600">
          <ImageIcon size={24} className="text-gray-400 dark:text-gray-500" />
        </div>
      )}
      {statusIndicator}
      {/* Show remove button if not uploading, or if it's an error state */}
      {(status !== PREVIEW_STATUS.UPLOADING) && ( // Simpler condition: Don't show remove if actively uploading
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-700 focus:outline-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out"
          aria-label="Remove image"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
} 