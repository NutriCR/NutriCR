import Card from '@/components/ui/Card';

export default function PerfilPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
      </div>

      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-4xl mb-3">
          👤
        </div>
        <p className="font-semibold text-slate-800 text-lg">Nombre Paciente</p>
        <p className="text-slate-500 text-sm">paciente@email.com</p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Datos físicos</h2>
        {[
          { label: 'Peso', value: '-- kg' },
          { label: 'Altura', value: '-- cm' },
          { label: 'IMC', value: '--' },
          { label: 'Objetivo', value: 'Sin definir' },
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <span className="text-slate-500 text-sm">{item.label}</span>
            <span className="font-medium text-slate-800">{item.value}</span>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Mi nutriólogo</h2>
        <p className="text-slate-400 text-sm">Sin nutriólogo asignado</p>
      </Card>
    </div>
  );
}
