import Card from '@/components/ui/Card';

export default function PlanPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mi Plan</h1>
        <p className="text-slate-500 mt-1">Plan nutricional asignado</p>
      </div>

      <Card className="p-5">
        <div className="text-center py-8 text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Sin plan asignado</p>
          <p className="text-sm mt-1">Tu nutricionista aún no ha creado tu plan</p>
        </div>
      </Card>
    </div>
  );
}
