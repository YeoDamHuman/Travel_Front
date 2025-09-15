// src/pages/GuidePage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, BookOpen, Calendar, UserCircle, Sparkles } from "lucide-react";

const GuidePage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      icon: <Calendar className="w-8 h-8 text-yellow-500" />,
      title: "여행 일정 만들기",
      desc: [
        "여행 지역과 기간, 예산을 설정하세요.",
        "하루 최소 2곳, 최대 5곳의 관광지를 담을 수 있습니다.",
        "AI가 최적 동선을 계산해 효율적인 일정표를 제공합니다.",
      ],
    },
    {
      icon: <BookOpen className="w-8 h-8 text-green-500" />,
      title: "여행 일기 작성",
      desc: [
        "여행 중의 사진과 추억을 기록하세요.",
        "여행이 끝난 뒤에도 일기를 꺼내보며 다시 여행할 수 있습니다.",
      ],
    },
    {
      icon: <MapPin className="w-8 h-8 text-blue-500" />,
      title: "핫플 탐색",
      desc: [
        "사람들이 많이 찾은 인기 여행지를 확인하세요.",
        "사진, 날씨, 관광지 정보를 보고 즐겨찾기에 추가할 수 있습니다.",
      ],
    },
    {
      icon: <UserCircle className="w-8 h-8 text-purple-500" />,
      title: "마이페이지",
      desc: [
        "내 여행, 여행일기, 즐겨찾기를 한눈에 관리하세요.",
        "친구와 함께한 기록도 모아볼 수 있습니다.",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* 상단 소개 Hero */}
      <section className="relative text-center px-6 pt-16 pb-20 bg-gradient-to-r from-blue-100 via-white to-blue-50">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <img
              src="/logo512.png"
              alt="여담 로고"
              className="w-20 h-20 drop-shadow-md animate-bounce"
            />
          </div>
          <h1 className="font-jalnongothic text-3xl font-bold text-gray-800 mb-4">
            여담 ✨ 여행을 담다
          </h1>
          <p className="text-gray-600 leading-relaxed text-base md:text-lg">
            여행 준비부터 기록, 그리고 추억까지.
            <br />
            여담은 여행의 모든 순간을 함께하는 <b>스마트 여행 파트너</b>입니다.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-8 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-lg transition"
          >
            지금 시작하기 🚀
          </button>
        </div>
      </section>

      {/* 주요 기능 Steps */}
      <section className="flex-1 py-12">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-10 flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          여담 주요 기능
          <Sparkles className="w-6 h-6 text-yellow-500" />
        </h2>
        <div className="grid gap-6 px-6 md:px-16 lg:px-32">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow hover:shadow-md transition"
            >
              <div className="flex-shrink-0">{s.icon}</div>
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">
                  {s.title}
                </h3>
                {Array.isArray(s.desc) ? (
                  s.desc.map((line, idx) => (
                    <p
                      key={idx}
                      className="text-sm text-gray-600 leading-relaxed mb-1"
                    >
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA & 문의 */}
      <section className="bg-blue-50 text-center py-12 px-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          여행, 더 이상 혼자 고민하지 마세요!
        </h2>
        <p className="text-gray-600 mb-6">
          여담과 함께라면 여행 준비가 간편해지고, 여행 기록은 더 특별해집니다.
        </p>


        <div className="text-sm text-gray-500 mt-8">
          서비스 관련 문의:{" "}
          <span className="text-gray-700 font-medium">doheun9489@naver.com</span>
        </div>
      </section>
    </div>
  );
};

export default GuidePage;
