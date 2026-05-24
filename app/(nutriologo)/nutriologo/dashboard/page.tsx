import Card from '@/components/ui/Card';

const stats = [
  { label: 'Pacientes activos', value: '0', icon: '👥' },
  { label: 'Planes activos', value: '0', icon: '📋' },
  { label: 'Recetas generadas', value: '0', icon: '🍽️' },
  { label: 'Ingresos del mes', value: '₡0', icon: '💰' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Bienvenido a NutriCR</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Pacientes recientes</h2>
          <p className="text-slate-400 text-sm">Sin pacientes aún</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Actividad reciente</h2>
          <p className="text-slate-400 text-sm">Sin actividad reciente</p>
        </Card>
      </div>
    </div>
  );
}
