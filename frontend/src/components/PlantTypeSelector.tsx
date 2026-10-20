import { getSupportedPlants } from "@/lib/multiPlantDetector";

interface PlantTypeSelectorProps {
  value: string;
  onChange: (plantId: string) => void;
  disabled?: boolean;
}

export function PlantTypeSelector({ value, onChange, disabled = false }: PlantTypeSelectorProps) {
  const plants = getSupportedPlants();

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
    amber: "bg-amber-50 hover:bg-amber-100 text-amber-700",
    yellow: "bg-yellow-50 hover:bg-yellow-100 text-yellow-700",
    orange: "bg-orange-50 hover:bg-orange-100 text-orange-700",
    red: "bg-red-50 hover:bg-red-100 text-red-700",
    green: "bg-green-50 hover:bg-green-100 text-green-700",
  };

  const activeBgMap: Record<string, string> = {
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-600 text-white",
    yellow: "bg-yellow-600 text-white",
    orange: "bg-orange-600 text-white",
    red: "bg-red-600 text-white",
    green: "bg-green-600 text-white",
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">Select Plant Type</label>
      <div className="grid grid-cols-5 gap-2">
        {plants.map((plant) => (
          <button
            key={plant.id}
            onClick={() => onChange(plant.id)}
            disabled={disabled}
            className={`p-3 rounded-xl text-center transition-all ${
              value === plant.id
                ? activeBgMap[plant.color] || "bg-emerald-600 text-white"
                : colorMap[plant.color] || "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="text-2xl mb-1">{plant.icon}</div>
            <div className="text-xs font-semibold">{plant.name}</div>
            <div className="text-xs opacity-75 mt-0.5 line-clamp-1">{plant.diseaseCount} diseases</div>
          </button>
        ))}
      </div>
    </div>
  );
}
