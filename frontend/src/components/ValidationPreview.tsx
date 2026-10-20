import { AlertCircle, CheckCircle2, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ValidationPreviewProps {
  imageDataUrl: string;
  validationResult: {
    isPlant: boolean;
    confidence: number;
    reason: string;
    detectedClass?: string;
  } | null;
  isValidating: boolean;
  selectedPlant: string;
  onConfirm: () => void;
  onRetake: () => void;
  onSkip?: () => void;
  beforeActions?: ReactNode;
}

export function ValidationPreview({
  imageDataUrl,
  validationResult,
  isValidating,
  selectedPlant,
  onConfirm,
  onRetake,
  onSkip,
  beforeActions,
}: ValidationPreviewProps) {
  const isValid = validationResult?.isPlant !== false;

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg"
        style={{ aspectRatio: "4/3" }}
      >
        <img
          src={imageDataUrl}
          alt={`Captured ${selectedPlant}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Status Badge */}
        <div className="absolute bottom-3 left-3">
          <Badge
            className={cn(
              "border-0 text-xs font-semibold",
              isValidating
                ? "bg-blue-600 text-white"
                : isValid
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
            )}
          >
            {isValidating
              ? "Validating..."
              : isValid
                ? "✓ Plant Detected"
                : "⚠ Low Confidence"}
          </Badge>
        </div>

        {/* Confidence Ring - REMOVED */}
      </div>

      {/* Validation Details Card */}
      {validationResult && (
        <Card
          className={cn(
            "border-2",
            isValid
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          )}
        >
          <CardContent className="p-4 space-y-3">
            {/* Status */}
            <div className="flex items-start gap-3">
              {isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div
                  className={cn(
                    "font-semibold text-sm",
                    isValid ? "text-emerald-900" : "text-amber-900"
                  )}
                >
                  {isValid ? "Plant Detected" : "Low Confidence"}
                </div>
                <div
                  className={cn(
                    "text-xs mt-1",
                    isValid ? "text-emerald-700" : "text-amber-700"
                  )}
                >
                  {isValid
                    ? "Plant detected successfully."
                    : validationResult.reason}
                </div>
              </div>
            </div>

            {/* Detected Class */}
            {validationResult.detectedClass && (
              <div className="flex items-center gap-2 text-xs">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Detected as:{" "}
                  <span className="font-medium">
                    {validationResult.detectedClass}
                  </span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {beforeActions}

      <div className="space-y-2">
        <Button
          onClick={onConfirm}
          disabled={isValidating}
          size="lg"
          className="w-full h-12 bg-primary text-white font-semibold"
        >
          {isValidating ? "Validating..." : "✓ Proceed with Analysis"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onRetake}
            variant="outline"
            size="lg"
            className="h-11"
          >
            ↻ Retake Photo
          </Button>
          {onSkip && (
            <Button
              onClick={onSkip}
              variant="ghost"
              size="lg"
              className="h-11 text-muted-foreground"
            >
              Skip Check
            </Button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            {isValid
              ? "Image looks good! Proceed to get AI-powered disease analysis."
              : "Image quality is low. For better results, retake the photo with better lighting and focus on the affected area."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
