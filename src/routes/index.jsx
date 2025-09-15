import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppBackHandler from '../components/AppBackHandler';

import HomePage from '../pages/HomePage';
import SearchPage from '../pages/SearchPage';
import Splash from '../pages/Splash';
import LoginPage from '../pages/Login_and_Signup/LoginPage';
import GuidePage from '../pages/GuidePage';
import SignUpPage from '../pages/Login_and_Signup/SignUpPage';
import KakaoCallbackPage from '../pages/Login_and_Signup/KakaoCallbackPage';
import FindPasswordPage from '../pages/Login_and_Signup/FindPasswordPage';
import VerifyCodePage from '../pages/Login_and_Signup/VerifyCodePage';
import ResetPasswordPage from '../pages/Login_and_Signup/ResetPasswordPage';
import MyPage from '../pages/MyPage';
import EditProfile from '../pages/EditProfilePage';
import AuthChecker from '../components/auth/AuthChecker';

import HotBoardPage from '../pages/Board/HotBoardPage';
import RegionDetailPage from '../pages/Board/RegionDetailPage';
import PlaceDetail from '../pages/Board/PlaceDetail';

import TravelDiaryBoardPage from '../pages/Travel_Diary/TravelDiaryBoardPage';
import TravelDiaryDetailPage from '../pages/Travel_Diary/TravelDiaryDetailPage';
import WriteTravelDiaryPage from '../pages/Travel_Diary/WriteTravelDiaryPage';
import UpdateTravelDiaryPage from '../pages/Travel_Diary/UpdateTravelDiaryPage';
import PlanLocationPage from '../pages/Plan/PlanLocationPage';
import PlanDatePage from '../pages/Plan/PlanDatePage';
import PlanStylePage from '../pages/Plan/PlanStylePage';
import PlanBudgetPage from '../pages/Plan/PlanBudgetPage';
import PlanCartPage from '../pages/Plan/PlanCartPage';
import PlanFlowBoundary from '../components/plan/PlanFlowBoundary';

import ScheduleAutoPage from '../pages/Schedule/ScheduleAutoPage';
import ScheduleResultPage from '../pages/Schedule/ScheduleResultPage';
import ScheduleViewPage from '../pages/Schedule/ScheduleViewPage';
import ScheduleInvitePage from '../pages/Schedule/ScheduleInvitePage';
import AddPlace from '../pages/Schedule/AddPlace';

import InviteAcceptPage from '../pages/InviteAcceptPage';

const AppRoutes = () => (
  <Router>
    <AppBackHandler />
    <AuthChecker />
    <Routes>
      <Route path="/splash" element={<Splash />} />
      <Route path="/" element={<HomePage />} />

      <Route path="/search" element={<SearchPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/guide" element={<GuidePage />} />

      <Route path="/find-password" element={<FindPasswordPage />} />
      <Route path="/find-password/verify" element={<VerifyCodePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route path="/mypage" element={<MyPage />} />
      <Route path="/edit/profile" element={<EditProfile />} />

      <Route path="/board/hot" element={<HotBoardPage />} />
      <Route path="/region/detail/:city" element={<RegionDetailPage />} />
      <Route path="/place/detail/:contentId" element={<PlaceDetail />} />

      <Route path="/board/travel/diary" element={<TravelDiaryBoardPage />} />
      <Route
        path="/board/travel/diary/:id"
        element={<TravelDiaryDetailPage />}
      />
      <Route path="/write/travel/diary" element={<WriteTravelDiaryPage />} />
      <Route
        path="/update/travel/diary/:boardId"
        element={<UpdateTravelDiaryPage />}
      />

      <Route path="/plan" element={<PlanFlowBoundary />}>
        <Route path="location" element={<PlanLocationPage />} />
        <Route path="date" element={<PlanDatePage />} />
        <Route path="style" element={<PlanStylePage />} />
        <Route path="budget" element={<PlanBudgetPage />} />
        <Route path="cart" element={<PlanCartPage />} />
        <Route path="auto" element={<ScheduleAutoPage />} />
        <Route
          path="schedule/result/:scheduleId"
          element={<ScheduleResultPage />}
        />
        <Route path="add" element={<AddPlace />} />
      </Route>
      <Route path="/schedule/view/:scheduleId" element={<ScheduleViewPage />} />
      <Route
        path="/schedule/invite/:scheduleId"
        element={<ScheduleInvitePage />}
      />

      <Route path="/kakao/callback" element={<KakaoCallbackPage />} />
      <Route path="/invite" element={<InviteAcceptPage />} />
    </Routes>
  </Router>
);

export default AppRoutes;
