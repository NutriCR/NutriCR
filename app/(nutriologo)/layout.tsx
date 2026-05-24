import Sidebar from '@/components/nutriologo/Sidebar';
import NutriHeader from '@/components/nutriologo/Header';

export default function NutriologoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NutriHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
