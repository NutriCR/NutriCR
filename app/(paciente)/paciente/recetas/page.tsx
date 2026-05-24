import Card from '@/components/ui/Card';

export default function RecetasPacientePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mis Recetas</h1>
        <p className="text-slate-500 mt-1">Recetas generadas para ti</p>
      </div>

      <Card className="p-5">
        <div className="text-center py-8 text-slate-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-medium">Sin recetas disponibles</p>
          <p className="text-sm mt-1">Tu nutriólogo generará recetas personalizadas para ti</p>
        </div>
      </Card>
    </div>
  );
}
