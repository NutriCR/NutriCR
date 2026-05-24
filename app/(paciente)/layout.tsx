import PacienteHeader from '@/components/paciente/Header';
import BottomNav from '@/components/paciente/BottomNav';

export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white relative">
      <PacienteHeader />
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
