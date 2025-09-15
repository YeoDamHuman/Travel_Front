import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PLACE_IMG = '/images/default_place.jpg';

const PlaceList = ({
  contentId,
  destination,
  tema,
  location,
  tel,
  imageUrl,
  showTema = false,
}) => {
  const navigate = useNavigate();

  const safeContentId = contentId ?? '';
  const safeTitle = (destination && String(destination).trim()) || '이름 미상';
  const safeImg = (imageUrl && String(imageUrl).trim()) || null;

  const handleClick = useCallback(() => {
    if (!safeContentId) return;
    navigate(`/place/detail/${safeContentId}`);
  }, [navigate, safeContentId]);

  return (
    <div
      className="flex bg-white rounded-xl overflow-hidden shadow pt-6 pb-6 pr-3 pl-3 gap-5 mb-3 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      aria-label={`${safeTitle} 상세보기`}
    >
      {/* 썸네일 */}
      <div className="w-24 h-24 flex-shrink-0">
        {safeImg ? (
          <img
            src={safeImg}
            alt={`${safeTitle} 이미지`}
            className="w-full h-full object-cover rounded-md"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement.innerHTML = `
                <div class="w-full h-full rounded-md bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
                  No Image
                </div>
              `;
            }}
          />
        ) : (
          <div className="w-full h-full rounded-md bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
            No Image
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-col justify-between flex-1 min-w-0 mt-[0.2rem] mb-[0.4rem]">
        <p className="font-semibold truncate">{safeTitle}</p>
        <div>
          {tel && (
            <p className="text-xs text-gray-500">
              이용문의 :{' '}
              <a
                href={`tel:${tel.replaceAll(/[^0-9+]/g, '')}`}
                className="underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tel}
              </a>
            </p>
          )}

          {location && (
            <div className="text-xs text-gray-500 truncate">
              주소 : {location}
            </div>
          )}

          {showTema && tema && (
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded-full">
                #{tema}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlaceList);
