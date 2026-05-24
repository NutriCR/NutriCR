import Card from '@/components/ui/Card';

export default function InicioPage() {
  return (
    <div className="space-y-5">
      <div className="pt-2">
        <p className="text-slate-500 text-sm">Buenos días,</p>
        <h1 className="text-2xl font-bold text-slate-800">Paciente</h1>
      </div>

      <Card className="p-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white border-0">
        <p className="text-sm opacity-90">Progreso de hoy</p>
        <div className="flex items-end gap-1 mt-1">
          <span className="text-3xl font-bold">0</span>
          <span className="text-lg opacity-90">/ 2000 kcal</span>
        </div>
        <div className="mt-3 bg-white/20 rounded-full h-2">
          <div className="bg-white rounded-full h-2 w-0" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Proteínas', value: '0g', color: 'text-blue-600' },
          { label: 'Carbos', value: '0g', color: 'text-amber-600' },
          { label: 'Grasas', value: '0g', color: 'text-rose-600' },
        ].map((macro) => (
          <Card key={macro.label} className="p-3 text-center">
            <p className={`text-lg font-bold ${macro.color}`}>{macro.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{macro.label}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Comidas de hoy</h2>
        {['Desayuno', 'Almuerzo', 'Cena', 'Merienda'].map((comida) => (
          <Card key={comida} className="p-4 mb-2 flex items-center justify-between">
            <span className="text-slate-700 font-medium">{comida}</span>
            <span className="text-sm text-slate-400">Sin registrar</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
