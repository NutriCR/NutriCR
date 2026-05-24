import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function PlanesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planes Nutricionales</h1>
          <p className="text-slate-500 mt-1">Crea y gestiona planes personalizados</p>
        </div>
        <Button>+ Nuevo plan</Button>
      </div>

      <Card className="p-6">
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No hay planes creados</p>
          <p className="text-sm mt-1">Crea un plan nutricional para un paciente</p>
        </div>
      </Card>
    </div>
  );
}
