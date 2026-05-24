import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function PacientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-slate-500 mt-1">Gestiona tus pacientes</p>
        </div>
        <Button>+ Nuevo paciente</Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No hay pacientes registrados</p>
          <p className="text-sm mt-1">Agrega tu primer paciente para comenzar</p>
        </div>
      </Card>
    </div>
  );
}
