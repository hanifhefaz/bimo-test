import { ReactNode } from 'react';
import { UserInfoBar } from './UserInfoBar';
import { TopTabs } from './TopTabs';

interface NewAppLayoutProps {
  children: ReactNode;
  hideTabs?: boolean;
}

export function NewAppLayout({ children, hideTabs = false }: NewAppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UserInfoBar />
      {!hideTabs && <TopTabs />}
      <main className={`flex-1 ${hideTabs ? 'pt-14' : 'pt-24 md:pt-[100px]'} overflow-y-auto`}>
        {children}
      </main>
    </div>
  );
}
