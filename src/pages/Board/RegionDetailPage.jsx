import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { message } from 'antd';

import DefaultLayout from '../../layouts/DefaultLayout';
import BackHeader from '../../components/header/BackHeader';
import PlaceList from '../../components/board/PlaceList';
import RegionSummary from '../../components/board/RegionSummary';
import PrimaryButton from '../../components/common/PrimaryButton';

import { getWeather } from '../../api/weather/getWeather';
import { getPlacesByRegion } from '../../api/place/getPlacesByRegion';
import { getHotRegions } from '../../api/region/getHotRegions';
import useUserStore from '../../store/userStore';

const RegionDetailPage = () => {
  const navigate = useNavigate();
  const { city: cityParam } = useParams();
  const accessToken = useUserStore((s) => s.accessToken);
  const [messageApi, contextHolder] = message.useMessage();

  const locationHook = useLocation();
  const state = locationHook.state || {};

  const decodedCity = state.city
    ? decodeURIComponent(state.city)
    : cityParam
    ? decodeURIComponent(cityParam)
    : '';

  const ldongRegnCd =
    state.ldongRegnCd ??
    state.lDongRegnCd ??
    new URLSearchParams(locationHook.search).get('ldongRegnCd') ??
    new URLSearchParams(locationHook.search).get('lDongRegnCd') ??
    '';

  const ldongSignguCd =
    state.ldongSignguCd ??
    state.lDongSignguCd ??
    new URLSearchParams(locationHook.search).get('ldongSignguCd') ??
    new URLSearchParams(locationHook.search).get('lDongSignguCd') ??
    '';

  const [regionInfo, setRegionInfo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [places, setPlaces] = useState([]);
  const [page, setPage] = useState(0);
  const size = 20;
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const idSetRef = useRef(new Set());

  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y =
            window.scrollY ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0;
          setShowTop(y > 200); // 200px 넘으면 표시
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // 초기 상태 계산
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🔻 무한스크롤 감시점 & 중복요청 방지용 최신 상태 ref
  const loadMoreRef = useRef(null);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const pageRef = useRef(page);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const normalizeHttps = (u) =>
    typeof u === 'string' ? u.trim().replace(/^http:\/\//i, 'https://') : '';

  const handleCreateSchedule = () => {
    if (!accessToken) {
      messageApi.warning(
        <>
          많은 즐길거리를 보고 싶다면 <br />
          로그인 및 회원가입 해주세요!
        </>
      );
      return;
    }

    if (!ldongRegnCd || !ldongSignguCd) {
      messageApi.warning('지역 정보가 부족합니다.');
      return;
    }

    const imageUrl =
      normalizeHttps(regionInfo?.regionImage) ||
      normalizeHttps(state?.imageUrl) ||
      '';

    navigate('/plan/date', {
      state: { ldongRegnCd, ldongSignguCd, city: decodedCity, imageUrl },
    });
  };

  // 🔹 지역 요약 불러오기
  useEffect(() => {
    const loadRegionInfo = async () => {
      try {
        const res = await getHotRegions(100);
        if (res.success && Array.isArray(res.data)) {
          const found = res.data.find((r) => r.regionName === decodedCity);
          if (found) setRegionInfo(found);
        }
      } catch (e) {
        console.error('지역 요약 불러오기 실패:', e);
      }
    };

    if (decodedCity) {
      loadRegionInfo();
    }
  }, [decodedCity]);

  // 🔹 날씨 불러오기
  const fetchWeather = useCallback(async () => {
    if (!decodedCity) return;
    try {
      setWeatherLoading(true);
      const cleanCityName = decodedCity.replace(/(시|군|구)$/, '');
      const response = await getWeather(cleanCityName);

      if (response.success && response.data) {
        setWeather(response.data);
      } else {
        setWeather(null);
      }
    } catch {
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [decodedCity]);

  useEffect(() => {
    if (decodedCity) {
      fetchWeather();
    }
  }, [decodedCity, fetchWeather]);

  // 🔹 즐길거리 초기화
  useEffect(() => {
    setPlaces([]);
    setPage(0);
    setHasMore(true);
    idSetRef.current.clear();
  }, [decodedCity, ldongRegnCd, ldongSignguCd]);

  // 🔹 즐길거리 가져오기 (페이지네이션)
  const fetchPage = useCallback(
    async (pageToLoad) => {
      if (!ldongRegnCd || !ldongSignguCd) return;
      if (loadingRef.current) return;

      try {
        setLoading(true);

        const apiParams = {
          ldongRegnCd: String(ldongRegnCd),
          ldongSignguCd: String(ldongSignguCd),
          page: pageToLoad,
          size,
        };

        const res = await getPlacesByRegion(apiParams);

        if (res.success && Array.isArray(res.data?.content)) {
          const batch = res.data.content;
          const next = [];

          for (const item of batch) {
            const id = item.contentId ?? item.id;
            if (!id || idSetRef.current.has(id)) continue;
            idSetRef.current.add(id);

            next.push({
              contentId: id,
              destination: item.title,
              category:
                item.lclsSystm3 ||
                item.lclsSystm2 ||
                item.lclsSystm1 ||
                item.cat3 ||
                item.cat2 ||
                item.cat1 ||
                '기타',
              location: item.address || '',
              opentime: item.openTime || '-',
              closetime: item.closeTime || '-',
              tel: item.tel || '정보 없음',
              imageUrl: item.firstImage,
            });
          }

          setPlaces((prev) => [...prev, ...next]);

          // 🔻 size 미만이면 끝으로 판단
          setHasMore(batch.length === size);

          setPage(pageToLoad);
        } else {
          setHasMore(false);
        }
      } catch (e) {
        console.warn('장소 데이터 로드 실패:', e?.message || e);
      } finally {
        setLoading(false);
      }
    },
    [ldongRegnCd, ldongSignguCd, size]
  );

  // 첫 페이지
  useEffect(() => {
    if (decodedCity && ldongRegnCd && ldongSignguCd) {
      fetchPage(0);
    } else if (decodedCity) {
      setPlaces([]);
    }
  }, [decodedCity, ldongRegnCd, ldongSignguCd, fetchPage]);

  // 🔹 IntersectionObserver로 무한 스크롤
  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!decodedCity || !ldongRegnCd || !ldongSignguCd) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (!loadingRef.current && hasMoreRef.current) {
          fetchPage(pageRef.current + 1);
        }
      },
      {
        root: null, // window 스크롤
        rootMargin: '200px', // 미리 당겨서 로드
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [decodedCity, ldongRegnCd, ldongSignguCd, fetchPage]);

  // 🔹 더보기 버튼 (백업)
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPage(page + 1);
    }
  };

  return (
    <DefaultLayout>
      {contextHolder}
      <div className="w-full mx-auto">
        <BackHeader />
        <div className="px-4 sm:px-6 md:px-8 bg-[#F8FBFF]">
          <div className="pb-6">
            <RegionSummary
              title={decodedCity}
              description={regionInfo?.description}
              regionImage={regionInfo?.regionImage}
            />
          </div>

          {/* 날씨 */}
          <div className="pb-6">
            <h3 className="text-base font-semibold text-gray-800 mb-2">날씨</h3>
            {weatherLoading ? (
              <div className="flex items-center justify-center px-4 py-3 bg-white rounded-lg shadow">
                <p className="text-sm text-gray-500">
                  날씨 정보를 불러오는 중...
                </p>
              </div>
            ) : weather ? (
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://openweathermap.org/img/wn/${weather?.weather?.[0]?.icon}@2x.png`}
                    alt={weather?.weather?.[0]?.description || 'weather'}
                    className="w-10 h-10"
                  />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">
                      최저 {weather?.main?.temp_min ?? '-'}°C <br />
                      최고 {weather?.main?.temp_max ?? '-'}°C
                    </p>
                    <p className="text-gray-500">
                      현재상태 : {weather?.weather?.[0]?.description ?? ''}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://search.naver.com/search.naver?query=${encodeURIComponent(
                    decodedCity
                  )}+날씨`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 text-sm hover:underline"
                >
                  날씨 보러가기
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow">
                <p className="text-sm text-gray-400">
                  날씨 정보를 불러올 수 없습니다.
                </p>
                <button
                  onClick={fetchWeather}
                  className="text-blue-500 text-sm hover:underline"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>

          {/* 즐길거리 */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              즐길거리
            </h3>
            <div className="space-y-3">
              {places.length > 0 ? (
                <>
                  {places.map((p) => (
                    <PlaceList key={p.contentId} {...p} />
                  ))}

                  {/* 🔻 무한 스크롤 감시점 (이 엘리먼트가 뷰포트에 들어오면 다음 페이지 자동 로드) */}
                  <div ref={loadMoreRef} className="h-1" />

                  <div className="pt-2 pb-[5rem] text-center">
                    {hasMore ? (
                      <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="px-3 py-2 text-sm rounded-lg bg-white shadow border hover:bg-gray-50 disabled:opacity-60"
                      >
                        {loading ? '불러오는 중…' : '더 보기'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        마지막입니다.
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 mb-2">
                    즐길거리가 없습니다.
                  </p>
                  {(!ldongRegnCd || !ldongSignguCd) && (
                    <p className="text-xs text-red-400">
                      법정동 코드가 누락되었습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ⬇️ ADD: 맨 위로 버튼 (떠있는 고정 버튼) */}
      {showTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="맨 위로 가기"
          className="
      fixed bottom-20 right-5 z-50
      h-11 w-11 rounded-full
      bg-white/95 border border-gray-200 shadow-lg backdrop-blur
      flex items-center justify-center
      text-gray-700 text-lg
      active:translate-y-[1px] active:shadow-md
    "
        >
          ↑
        </button>
      )}
    </DefaultLayout>
  );
};

export default RegionDetailPage;
