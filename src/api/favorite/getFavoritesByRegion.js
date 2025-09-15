import http from '../../utils/authAxios';

export async function getFavoritesByRegion(ldongRegnCd, ldongSignguCd, token) {
  if (!ldongRegnCd || !ldongSignguCd) {
    throw new Error('법정동 코드(ldongRegnCd, ldongSignguCd)가 필요합니다.');
  }

  try {
    const { data } = await http.get('/favorites/region', {
      params: {
        lDongRegnCd: String(ldongRegnCd),
        lDongSignguCd: String(ldongSignguCd),
      },
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    return data;
  } catch (error) {
    console.error('즐겨찾기 조회 실패:', error);
    throw error;
  }
}
