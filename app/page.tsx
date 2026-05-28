import { Suspense } from "react";
import { HeartPulse } from "lucide-react";
import Dashboard from "./components/Dashboard";

export default function Home() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner inner">
          <div className="brand">
            <span className="brand-mark"><HeartPulse size={17} /></span>
            건강이음
          </div>
          <nav className="nav" aria-label="주요 메뉴">
            <a className="nav-link" href="#dashboard"><span>대시보드</span></a>
            <a className="nav-link" href="#chat"><span>AI 상담</span></a>
            <a className="nav-link" href="#data"><span>데이터</span></a>
          </nav>
        </div>
      </header>
      <main id="dashboard">
        <Suspense>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  );
}
