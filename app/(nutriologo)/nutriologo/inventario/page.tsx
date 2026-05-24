import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500 mt-1">Alimentos e ingredientes disponibles</p>
        </div>
        <Button>+ Agregar alimento</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {['Todos', 'Proteínas', 'Carbohidratos', 'Grasas'].map((cat) => (
          <button
            key={cat}
            className="py-2 px-4 rounded-lg text-sm font-medium bg-white border border-slate-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      <Card className="p-6">
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🥦</p>
          <p className="font-medium">Inventario vacío</p>
          <p className="text-sm mt-1">Agrega alimentos para usarlos en recetas</p>
        </div>
      </Card>
    </div>
  );
}
