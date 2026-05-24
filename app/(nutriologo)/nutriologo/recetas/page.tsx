import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function RecetasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recetas con IA</h1>
          <p className="text-slate-500 mt-1">Genera recetas personalizadas con Claude</p>
        </div>
        <Button>✨ Generar receta</Button>
      </div>

      <Card className="p-5 border-brand-200 bg-brand-50">
        <div className="flex gap-3 items-start">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="font-semibold text-brand-800">IA Lista</p>
            <p className="text-sm text-brand-600">
              Claude analizará el perfil del paciente, su plan nutricional e inventario disponible para generar recetas
              personalizadas.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-medium">Sin recetas generadas</p>
          <p className="text-sm mt-1">Genera tu primera receta con IA</p>
        </div>
      </Card>
    </div>
  );
}
