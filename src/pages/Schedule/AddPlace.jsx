import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import DefaultLayout from '../../layouts/DefaultLayout';
import BackHeader from '../../components/header/BackHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import SearchBar from '../../components/common/SearchBar';
import { message } from 'antd';
import useScheduleStore from '../../store/scheduleStore';

import { getSchedule } from '../../api';
import { getFavoritesByRegion } from '../../api/favorite/getFavoritesByRegion';
import { getPlacesByRegion } from '../../api/place/getPlacesByRegion';
import { createScheduleItem } from '../../api';
import useUserStore from '../../store/userStore';
import PlaceList from '../../components/board/PlaceList';

const dedupBy = (arr, seen, item) => {
  const id = String(item.contentId ?? item.id ?? '');
  if (!id || seen.has(id)) return;
  seen.add(id);
  arr.push(item);
};

const AddPlace = () => {
  const navigate = useNavigate();
  const accessToken = useUserStore((s) => s.accessToken);
  const location = useLocation();
  const [sp] = useSearchParams();

  // === 입력(라우터/쿼리) ===
  const scheduleId = location.state?.scheduleId || sp.get('scheduleId') || '';
  const dayNumber = Number(location.state?.dayNumber || sp.get('day')) || 1;

  // 라우터/쿼리에서 받은 지역코드(초기값)
  const initRegn = location.state?.ldongRegnCd || sp.get('ldongRegnCd') || '';
  const initSigngu =
    location.state?.ldongSignguCd || sp.get('ldongSignguCd') || '';

  // === 화면 상태 ===
  const [favorites, setFavorites] = useState([]); // PlaceList 포맷
  const [places, setPlaces] = useState([]); // PlaceList 포맷
  const [favLoading, setFavLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const seenRef = useRef(new Set());

  const [selected, setSelected] = useState(new Set());
  const selectedCount = selected.size;

  const [baseOrder, setBaseOrder] = useState(1);

  // 검색 관련 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 탭 관련 상태
  const [activeTab, setActiveTab] = useState('favorites');

  //  이 상태만 믿고 동작: 지역코드(없으면 스케줄에서 채움)
  const [regionCodes, setRegionCodes] = useState({
    ldongRegnCd: initRegn,
    ldongSignguCd: initSigngu,
  });

  const detail = useScheduleStore((s) => s.detail);
  const setDetail = useScheduleStore((s) => s.setDetail);

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

  // 서버 0-베이스 여부 감지
  const isZeroBased = useMemo(() => {
    const items = Array.isArray(detail?.scheduleItems)
      ? detail.scheduleItems
      : [];
    return (
      items.some((it) => Number(it.dayNumber) === 0) ||
      items.some((it) => Number(it.order) === 0)
    );
  }, [detail]);

  // ↓↓↓ 기본 검증 + baseOrder 계산 + (지역코드 채우기)
  useEffect(() => {
    if (!scheduleId) {
      message.warning('scheduleId가 없어 돌아갑니다.');
      navigate(-1);
      return;
    }
    (async () => {
      try {
        // 스토어에 없으면 한 번 로드
        const res =
          detail &&
          String(detail.scheduleId ?? detail.id) === String(scheduleId)
            ? detail
            : await getSchedule(scheduleId);
        if (res && res !== detail) setDetail(res);

        const items = Array.isArray((res ?? detail)?.scheduleItems)
          ? (res ?? detail).scheduleItems
          : [];

        // baseOrder 계산
        const serverDay = isZeroBased ? dayNumber - 1 : dayNumber; // 서버 포맷
        const maxOrderInDay = items
          .filter((it) => Number(it.dayNumber) === serverDay)
          .reduce(
            (m, it) => Math.max(m, Number(it.order ?? 0)),
            isZeroBased ? -1 : 0
          );
        setBaseOrder(maxOrderInDay + 1);

        // 같은 Day의 첫 아이템에서 지역코드 사용 (없으면 아무 아이템에서라도)
        const byDay = items.find(
          (it) =>
            Number(it.dayNumber) === serverDay &&
            it.ldongRegnCd &&
            it.ldongSignguCd
        );
        const anyWithCode = items.find(
          (it) => it.ldongRegnCd && it.ldongSignguCd
        );

        const c1 = byDay?.ldongRegnCd ?? anyWithCode?.ldongRegnCd ?? '';
        const c2 = byDay?.ldongSignguCd ?? anyWithCode?.ldongSignguCd ?? '';
        if (c1 && c2)
          setRegionCodes({
            ldongRegnCd: String(c1),
            ldongSignguCd: String(c2),
          });
      } catch (e) {
        console.warn('[AddPlace] init fail', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId, dayNumber]);

  // ===== 1) 즐겨찾기(전역) : PlaceList 포맷으로 맵핑 =====
  useEffect(() => {
    (async () => {
      try {
        setFavLoading(true);
        if (!regionCodes.ldongRegnCd || !regionCodes.ldongSignguCd) {
          setFavorites([]);
          return;
        }
        const res = await getFavoritesByRegion(
          regionCodes.ldongRegnCd,
          regionCodes.ldongSignguCd,
          accessToken
        );
        const list = Array.isArray(res?.favorites) ? res.favorites : [];

        setFavorites(
          list.map((x) => {
            const cid = String(x.contentId ?? x.id);
            const rawTitle = x.placeTitle || x.title || '';
            const destination =
              /^\d+$/.test(String(rawTitle)) && cid === String(rawTitle)
                ? '이름 없는 장소'
                : rawTitle || '이름 없는 장소';

            return {
              contentId: cid,
              destination,
              category: x.tema || x.theme || '기타',
              tema: x.tema || x.theme || '기타',
              location: x.address || '',
              opentime: x.openTime || '-',
              closetime: x.closeTime || '-',
              tel: x.tel || '',
              imageUrl: x.placeImage || x.imageUrl || x.firstImage || '',
              __isFavorite: true,
            };
          })
        );
      } catch (e) {
        console.error('[AddPlace] favorites load fail', e);
      } finally {
        setFavLoading(false);
      }
    })();
  }, [regionCodes.ldongRegnCd, regionCodes.ldongSignguCd]);

  // ===== 2) 지역 장소 로드 (PlaceList 포맷) =====
  const loadPlaces = async (pageToLoad, searchKeyword = '') => {
    const { ldongRegnCd, ldongSignguCd } = regionCodes;
    if (!ldongRegnCd || !ldongSignguCd) return;
    if (placeLoading) return;

    try {
      setPlaceLoading(true);
      const params = {
        ldongRegnCd: String(ldongRegnCd),
        ldongSignguCd: String(ldongSignguCd),
        page: pageToLoad,
        size: 20,
      };

      // 검색어가 있으면 파라미터에 추가
      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }

      const res = await getPlacesByRegion(params);

      const content = res?.data?.content ?? res?.content ?? [];
      const next = [];
      for (const it of content) {
        const cid = String(it.contentId ?? it.id);
        const rawTitle = it.title || it.placeTitle || '';
        const destination =
          /^\d+$/.test(String(rawTitle)) && cid === String(rawTitle)
            ? '이름 없는 장소'
            : rawTitle || '이름 없는 장소';

        const mapped = {
          contentId: cid,
          destination,
          category:
            it.lclsSystm3 ||
            it.lclsSystm2 ||
            it.lclsSystm1 ||
            it.cat3 ||
            it.cat2 ||
            it.cat1 ||
            '기타',
          location: it.address || '',
          opentime: it.openTime || '-',
          closetime: it.closeTime || '-',
          tel: it.tel || '정보 없음',
          imageUrl: it.firstImage || it.imageUrl || '',
        };
        dedupBy(next, seenRef.current, mapped);
      }

      if (pageToLoad === 0) {
        setPlaces(next);
      } else {
        setPlaces((prev) => [...prev, ...next]);
      }

      setHasMore(content.length === 20);
      setPage(pageToLoad);
    } catch (e) {
      console.error('[AddPlace] region places load fail', e);
    } finally {
      setPlaceLoading(false);
    }
  };

  // 지역코드가 준비되면 첫 페이지 로드 (둘러보기 탭일 때만)
  useEffect(() => {
    if (activeTab === 'browse') {
      setPlaces([]);
      setPage(0);
      setHasMore(true);
      seenRef.current.clear();
      if (regionCodes.ldongRegnCd && regionCodes.ldongSignguCd) {
        loadPlaces(0, searchTerm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionCodes.ldongRegnCd, regionCodes.ldongSignguCd, activeTab]);

  // 검색 처리 함수
  const handleSearch = () => {
    if (
      activeTab === 'browse' &&
      regionCodes.ldongRegnCd &&
      regionCodes.ldongSignguCd
    ) {
      setPlaces([]);
      setPage(0);
      setHasMore(true);
      seenRef.current.clear();
      setIsSearching(true);

      loadPlaces(0, searchTerm).finally(() => {
        setIsSearching(false);
      });
    }
  };

  // 검색어 변경 시 디바운싱 적용 (둘러보기 탭일 때만)
  useEffect(() => {
    if (activeTab === 'browse') {
      const timeoutId = setTimeout(() => {
        if (regionCodes.ldongRegnCd && regionCodes.ldongSignguCd) {
          handleSearch();
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, activeTab]);

  // 검색어 초기화
  const clearSearch = () => {
    setSearchTerm('');
  };

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm(''); // 탭 변경 시 검색어 초기화
  };

  // ===== 3) 선택/해제 =====
  const toggleSelect = (cid) => {
    setSelected((prev) => {
      const n = new Set(prev);
      const id = String(cid);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  // ===== 4) 저장 =====
  const [saving, setSaving] = useState(false);
  const handleAddSelected = async () => {
    if (!selectedCount) return message.info('추가할 장소를 선택하세요.');
    try {
      setSaving(true);
      const ids = Array.from(selected);
      const serverDay = isZeroBased ? dayNumber - 1 : dayNumber;

      await Promise.all(
        ids.map((cid, idx) =>
          createScheduleItem(scheduleId, {
            contentId: String(cid),
            dayNumber: serverDay,
            memo: '',
            cost: 0,
            order: baseOrder + idx,
          })
        )
      );

      // 최신 스케줄 재조회 → 스토어 반영
      const fresh = await getSchedule(scheduleId);
      setDetail(fresh);
      message.success('선택한 장소를 추가했어요.');
      navigate(-1);
    } catch (e) {
      console.error('[AddPlace] save fail', e?.response?.data || e);
      message.error('추가에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  // PlaceList 클릭 핸들러 (상세 페이지로 이동)
  const handlePlaceClick = (contentId, e) => {
    e.stopPropagation(); // 체크박스 클릭과 구분
    navigate(`/place/detail/${contentId}`);
  };

  // ===== 5) Selectable Row (PlaceList 래퍼) =====
  const SelectableRow = ({ item }) => {
    const cid = String(item.contentId);
    const checked = selected.has(cid);

    return (
      <div
        className={`relative rounded-xl ${
          checked ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        {/* PlaceList 클릭 시 상세 페이지로 이동 */}
        <div
          className="cursor-pointer"
          onClick={(e) => handlePlaceClick(cid, e)}
        >
          <PlaceList
            contentId={cid}
            destination={item.destination}
            category={item.category}
            tema={item.tema}
            location={item.location}
            opentime={item.opentime}
            closetime={item.closetime}
            tel={item.tel}
            imageUrl={item.imageUrl}
            showTema
          />
        </div>

        {/* 체크박스 (우상단) */}
        <label
          className="absolute top-3 right-3 cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(cid);
          }}
        >
          <input
            type="checkbox"
            className="w-5 h-5 align-middle"
            readOnly
            checked={checked}
            onChange={() => {}}
          />
        </label>
      </div>
    );
  };

  // 즐겨찾기 필터링 (검색어가 있을 때)
  const filteredFavorites = useMemo(() => {
    if (!searchTerm.trim()) return favorites;
    const term = searchTerm.toLowerCase();
    return favorites.filter(
      (item) =>
        item.destination && item.destination.toLowerCase().includes(term)
    );
  }, [favorites, searchTerm]);

  const filteredPlaces = useMemo(() => {
    if (!searchTerm.trim()) return places;
    const term = searchTerm.toLowerCase();
    return places.filter(
      (item) =>
        item.destination && item.destination.toLowerCase().includes(term)
    );
  }, [places, searchTerm]);

  // 힌트 문구도 regionCodes 기준
  const regionHint = useMemo(() => {
    if (!regionCodes.ldongRegnCd || !regionCodes.ldongSignguCd)
      return '지역 코드가 없어 즐겨찾기만 표시됩니다.';
    return '';
  }, [regionCodes.ldongRegnCd, regionCodes.ldongSignguCd]);

  return (
    <DefaultLayout>
      <BackHeader title="장소 추가" />
      <div className="px-4 sm:px-6 md:px-8 pb-20">
        {/* 탭 메뉴 */}
        <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleTabChange('favorites')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'favorites'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            즐겨찾기
          </button>
          <button
            onClick={() => handleTabChange('browse')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'browse'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            둘러보기
          </button>
        </div>

        {/* 검색바 */}
        <div className="mb-6">
          <SearchBar
            placeholder={
              activeTab === 'favorites'
                ? '즐겨찾기에서 검색하세요'
                : '장소를 검색하세요'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                '{searchTerm}' 검색 결과
              </span>
              <button
                onClick={clearSearch}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                검색 초기화
              </button>
            </div>
          )}
        </div>

        {/* 탭별 콘텐츠 */}
        {activeTab === 'favorites' ? (
          /* 즐겨찾기 탭 */
          <>
            {favLoading ? (
              <div className="text-sm text-gray-400 py-6 text-center">
                불러오는 중…
              </div>
            ) : filteredFavorites.length ? (
              <div className="space-y-2">
                {filteredFavorites.map((f) => (
                  <SelectableRow key={f.contentId} item={f} />
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-sm text-gray-400 py-6 text-center">
                검색된 즐겨찾기가 없어요.
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-6 text-center">
                즐겨찾기가 없어요.
              </div>
            )}
          </>
        ) : (
          /* 둘러보기 탭 */
          <>
            {regionHint && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm text-red-600">{regionHint}</span>
              </div>
            )}

            {regionCodes.ldongRegnCd && regionCodes.ldongSignguCd ? (
              <>
                {isSearching && page === 0 ? (
                  <div className="text-sm text-gray-400 py-6 text-center">
                    검색 중…
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {filteredPlaces.map((p) => (
                        <SelectableRow key={p.contentId} item={p} />
                      ))}
                    </div>

                    {places.length === 0 && !isSearching ? (
                      <div className="text-sm text-gray-400 py-6 text-center">
                        {searchTerm ? '검색 결과가 없어요.' : '장소가 없어요.'}
                      </div>
                    ) : (
                      <div className="text-center mt-4">
                        {hasMore ? (
                          <button
                            disabled={placeLoading}
                            onClick={() => loadPlaces(page + 1, searchTerm)}
                            className="px-4 py-2 text-sm rounded-lg bg-white shadow border hover:bg-gray-50 disabled:opacity-60"
                          >
                            {placeLoading ? '불러오는 중…' : '더 보기'}
                          </button>
                        ) : places.length > 0 ? (
                          <span className="text-xs text-gray-400">
                            마지막입니다.
                          </span>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : null}
          </>
        )}

        {/* 하단 고정 추가 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <PrimaryButton
            disabled={saving || selectedCount === 0}
            onClick={handleAddSelected}
            className="w-full"
          >
            {saving ? '추가 중…' : `선택한 ${selectedCount}개 추가`}
          </PrimaryButton>
        </div>
      </div>
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

export default AddPlace;
