import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { TopHeader } from "./TopHeader";

export const MainLayout = () => {
  return (
    <div className="min-h-screen gradient-dark">
      <TopHeader />
      <main className="pb-20 pt-4 px-4 max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
