// src/pages/schedule/ScheduleInvitePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import DefaultLayout from '../../layouts/DefaultLayout';
import BackHeader from '../../components/header/BackHeader';
import { message } from 'antd';
import { loadKakao } from '../../utils/kakao';
import useScheduleStore from '../../store/scheduleStore';
import usePlanStore from '../../store/planStore';
import useUserStore from '../../store/userStore';
import { getSchedule } from '../../api';

const fmt = (d) => {
  if (!d) return '';
  const [y, m, dd] = String(d).split('-');
  if (!y || !m || !dd) return String(d);
  return `${y}.${m}.${dd}`;
};

const ScheduleInvitePage = () => {
  const { scheduleId } = useParams();
  const [busy, setBusy] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false); // ✅ SDK 사전 로드 플래그

  // 스케줄 상세
  const detail = useScheduleStore((s) => s.detail);
  const setDetail = useScheduleStore((s) => s.setDetail);

  // detail 없을 때 제목 폴백
  const fallbackScheduleName = usePlanStore((s) => s.scheduleName);

  const meId = useUserStore((s) => s.userId);

  // ✅ 참여자 파싱
  const participants = useMemo(() => {
    const arr = Array.isArray(detail?.users) ? detail.users : [];
    return arr.map((u) => ({
      id: String(u.userId || ''),
      name: u.userName || '참여자',
      avatar: u.userProfileImage || '',
    }));
  }, [detail?.users]);

  // ✅ 본인 제외한 다른 참여자
  const otherMembers = useMemo(
    () =>
      participants.filter((p) => p.id && meId && String(p.id) !== String(meId)),
    [participants, meId]
  );

  const Avatar = ({ name, avatar }) => (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg border bg-white">
      <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 ring-1 ring-gray-200">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-600">
            {name?.[0] || '유'}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-800">{name}</span>
    </div>
  );

  // ✅ Kakao SDK를 페이지 진입 시 미리 로드 (버튼 클릭 전에 준비)
  useEffect(() => {
    let mounted = true;
    loadKakao()
      .then(() => {
        if (mounted) setKakaoReady(true);
      })
      .catch((e) => {
        console.error('[Kakao SDK] load fail', e);
        // ready=false면 버튼 클릭 시 경고만 띄우고 막음
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (String(detail?.scheduleId ?? detail?.id) === String(scheduleId))
          return;
        const res = await getSchedule(scheduleId);
        setDetail(res?.data ?? res);
      } catch (_) {
        // 조용히 실패: 버튼 공유는 계속 가능
      }
    })();
  }, [scheduleId, detail?.scheduleId, detail?.id, setDetail]);

  // 제목/날짜
  const planTitle = detail?.scheduleName || fallbackScheduleName || '여행 일정';
  const dateRange =
    detail?.startDate && detail?.endDate
      ? `${fmt(detail.startDate)} - ${fmt(detail.endDate)}`
      : '여행 날짜 미정';

  // ✅ .env에 둘 다 지원
  // REACT_APP_PUBLIC_WEB_BASE_URL=https://yeodam.site
  // VITE_PUBLIC_WEB_BASE_URL=https://yeodam.site
  const PUBLIC_WEB_BASE_URL =
    process.env.REACT_APP_PUBLIC_WEB_BASE_URL ||
    import.meta?.env?.VITE_PUBLIC_WEB_BASE_URL ||
    'https://yeodam.site';

  // 초대 URL - 카카오
  const inviteUrl = useMemo(() => {
    const u = new URL(`${PUBLIC_WEB_BASE_URL}/invite`);
    u.searchParams.set('scheduleId', String(scheduleId || ''));
    return u.toString();
  }, [scheduleId]);

  // 초대 URL - 복사
  const copy_inviteUrl = useMemo(() => {
    const u = new URL('https://yeodam.vercel.app/invite');
    u.searchParams.set('scheduleId', String(scheduleId || ''));
    return u.toString();
  }, [scheduleId]);

  const toHttps = (url) => {
    if (!url) return url;
    try {
      const u = new URL(url);
      if (u.protocol === 'http:') u.protocol = 'https:';
      return u.toString();
    } catch {
      return url;
    }
  };

  const thumbUrl = useMemo(() => {
    const fromDetail =
      detail?.regionImage || detail?.imageUrl || detail?.thumbnail;
    const fromItems = (detail?.scheduleItems || [])
      .map((it) => it.imageUrl || it.firstImage || it.firstimage)
      .find(Boolean);
    const fallback =
      'https://k.kakaocdn.net/dn/bkNtzF/btsQmfsu0l7/kakaolink40_original.png';
    return toHttps(fromDetail || fromItems || fallback);
  }, [detail]);

  const handleCopyLink = async () => {
    try {
      setBusy(true);
      await navigator.clipboard.writeText(copy_inviteUrl);
      message.success('초대 링크가 복사되었습니다! 카카오톡에 붙여넣어보세요.');
    } catch (e) {
      message.error('초대 링크 복사에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  // ✅ PlanInvitePage와 동일: 클릭 즉시 sendCustom 호출 (비동기 대기 X)
  const handleKakaoInvite = () => {
    if (!kakaoReady || !window.Kakao || !window.Kakao.isInitialized()) {
      message.warning('카카오 초기화 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const TEMPLATE_ID_RAW =
      process.env.REACT_APP_KAKAO_TEMPLATE_ID ||
      import.meta?.env?.VITE_KAKAO_TEMPLATE_ID ||
      '124047';
    const templateId = Number(TEMPLATE_ID_RAW);
    if (!Number.isFinite(templateId)) {
      message.error('KAKAO_TEMPLATE_ID 설정이 잘못되었습니다.');
      return;
    }

    try {
      // ⛳️ PlanInvitePage와 동일한 키 사용: '${PLAN_TITLE}' 등
      window.Kakao.Share.sendCustom({
        templateId,
        templateArgs: {
          PLAN_TITLE: String(planTitle),
          PLAN_DATE_RANGE:
            dateRange === '여행 날짜 미정' ? '' : String(dateRange),
          INVITE_URL: String(inviteUrl),
          THUMB_URL: String(thumbUrl), // ✅ regionImage 사용
        },
      });
      // 여기서 busy를 건드리지 않음: 팝업 차단/intent 핸들러 문제 방지
    } catch (e) {
      console.error('[Kakao Share] 실패:', e);
      message.error(
        '카카오 공유에 실패했어요. 키/도메인/템플릿을 확인해주세요.'
      );
    }
  };

  return (
    <DefaultLayout>
      <div className="w-full mx-auto pb-24">
        <BackHeader title="친구 초대" />

        <div className="px-4 sm:px-6 md:px-8">
          {/* 히어로: 이미지 없이 그라데이션 카드 */}
          <div className="mt-6 rounded-2xl overflow-hidden border shadow-sm">
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-5">
              <div className="flex items-start gap-3">
                {/* 심볼 자리 → regionImage 있으면 썸네일, 없으면 기존 ✈️ */}
                {thumbUrl ? (
                  <div
                    className="h-12 w-12 rounded-xl shadow-sm bg-white/20 overflow-hidden flex-shrink-0"
                    aria-label="지역 이미지"
                  >
                    <img
                      src={thumbUrl}
                      alt="thumbnail"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white text-xl shadow-sm">
                    ✈️
                  </div>
                )}
                {/* 타이틀/날짜 */}
                <div className="min-w-0 flex-1">
                  <h1 className="text-white font-extrabold text-lg truncate drop-shadow-sm">
                    {planTitle}
                  </h1>
                  <p className="text-white/90 text-sm mt-1">{dateRange}</p>
                </div>
              </div>
            </div>

            {/* 액션 바 */}
            <div className="bg-white p-4">
              <div className="flex gap-2">
                <button
                  onClick={handleKakaoInvite}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-yellow-300 hover:bg-yellow-300/90 text-black font-semibold py-2 text-sm disabled:opacity-50 transition"
                >
                  🗨️ 카카오톡으로 초대하기
                </button>
                <button
                  onClick={handleCopyLink}
                  disabled={busy}
                  className="flex-1 rounded-xl bg-blue-100 hover:bg-blue-100/80 text-blue-700 font-semibold py-2 text-sm disabled:opacity-50 transition"
                >
                  🔗 링크 복사하기
                </button>
              </div>
            </div>
          </div>

          {/* ✅ 참여자 섹션 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                참여자{' '}
                <span className="text-gray-500 font-normal">
                  ({participants.length}명)
                </span>
              </h2>
              {/* 필요 시: 초대 페이지에서도 겹친 아바타 요약 */}
              {participants.length > 0 && (
                <div className="flex -space-x-2">
                  {participants.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="inline-flex h-7 w-7 rounded-full ring-2 ring-white overflow-hidden bg-gray-200"
                    >
                      {p.avatar ? (
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-600">
                          {p.name?.[0] || '유'}
                        </div>
                      )}
                    </div>
                  ))}
                  {participants.length > 5 && (
                    <div className="inline-flex h-7 w-7 rounded-full ring-2 ring-white bg-gray-300 text-gray-700 text-[11px] items-center justify-center">
                      +{participants.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>

            {participants.length === 0 ? (
              <div className="rounded-xl border bg-gray-50 text-gray-600 text-sm p-4">
                아직 참여자가 없어요. 초대해서 일정을 함께 만들어보세요!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {participants.map((p) => (
                  <Avatar key={p.id} name={p.name} avatar={p.avatar} />
                ))}
              </div>
            )}

            {/* 본인 외 다른 사람 강조 메시지 (선택) */}
            {otherMembers.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                본인 외 <b>{otherMembers.length}명</b>이 이 일정에 참여
                중입니다.
              </p>
            )}
          </div>

          {/* 가이드 섹션 */}
          <div className="mt-6 space-y-3 text-[13px] text-gray-700">
            <div className="flex gap-2 items-start">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                1
              </span>
              <p>
                공유 받은 친구는 <b>초대 수락 페이지</b>에서 <b>확인</b>을
                누르면 이 일정의 <b>참여자</b>로 등록됩니다.
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                2
              </span>
              <p>
                카카오 공유가 어려우면 <b>링크 복사</b>로 직접 전달하세요.
              </p>
            </div>
          </div>

          {/* 주의 문구 */}
          <div className="mt-6 rounded-xl border bg-amber-50 text-amber-800 text-xs p-3 leading-relaxed">
            * 링크가 노출되면 누구나 접근할 수 있으니 신뢰할 수 있는 상대에게만
            공유해주세요.
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ScheduleInvitePage;
