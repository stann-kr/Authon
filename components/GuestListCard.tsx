
import React from 'react';

export interface Guest {
  id: string;
  name: string;
  status: 'pending' | 'checked' | 'deleted';
  checkInTime?: string;
  createdAt?: string;
  djId?: string;
  date?: string;
}

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

interface GuestListCardProps {
  guest: Guest;
  index: number;
  variant?: 'user' | 'admin';
  djName?: string;
  onCheck?: () => void;
  onDelete?: () => void;
  isCheckLoading?: boolean;
  isDeleteLoading?: boolean;
}

const GuestListCard: React.FC<GuestListCardProps> = ({
  guest,
  index,
  variant = 'user',
  djName,
  onCheck,
  onDelete,
  isCheckLoading = false,
  isDeleteLoading = false,
}) => {
  return (
    <div className="p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center">
            <span className="text-xs sm:text-sm font-mono text-gray-400">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm sm:text-base tracking-wider text-white uppercase truncate">
              {guest.name}
            </p>
            {(djName || guest.checkInTime || guest.createdAt) && (
              <div className="flex flex-wrap gap-2 mt-1">
                {djName && (
                  <span className="text-xs font-mono text-gray-400">
                    BY: {djName}
                  </span>
                )}
                {guest.createdAt && (
                  <span className="text-xs font-mono text-gray-500">
                    {formatTime(guest.createdAt)}
                  </span>
                )}
                {guest.checkInTime && (
                  <span className="text-xs font-mono text-green-400">
                    IN: {formatTime(guest.checkInTime)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {guest.status === 'pending' && (
            <>
              {variant === 'admin' && onCheck && (
                <button
                  onClick={onCheck}
                  disabled={isCheckLoading}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-black font-mono text-xs tracking-wider uppercase hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isCheckLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    'CHECK'
                  )}
                </button>
              )}

              {variant === 'user' && onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isDeleteLoading}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white font-mono text-xs tracking-wider uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleteLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    'DELETE'
                  )}
                </button>
              )}

              {variant === 'admin' && onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isDeleteLoading}
                  className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-600 text-gray-400 font-mono text-xs tracking-wider uppercase hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isDeleteLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <i className="ri-close-line"></i>
                  )}
                </button>
              )}
            </>
          )}

          {guest.status === 'checked' && (
            <div className="flex items-center gap-2">
              <span className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600/20 border border-green-600 text-green-400 font-mono text-xs tracking-wider uppercase">
                ACTIVE
              </span>
              {variant === 'admin' && onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isDeleteLoading}
                  className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-600 flex items-center justify-center text-gray-400 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isDeleteLoading ? (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <i className="ri-close-line text-sm"></i>
                  )}
                </button>
              )}
            </div>
          )}

          {guest.status === 'deleted' && (
            <span className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 text-gray-500 font-mono text-xs tracking-wider uppercase">
              REMOVED
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestListCard;
