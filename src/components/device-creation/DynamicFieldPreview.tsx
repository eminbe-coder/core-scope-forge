import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FormulaEngine } from '@/lib/formula-engine';

interface PropertyValue {
  name: string;
  value: any;
  options?: Array<{ code: string; label_en: string; label_ar?: string }>;
}

interface DynamicFieldPreviewProps {
  label: string;
  formula: string;
  properties: PropertyValue[];
  context?: 'sku' | 'description_en' | 'description_ar';
  className?: string;
}

export function DynamicFieldPreview({ label, formula, properties, context = 'description_en', className }: DynamicFieldPreviewProps) {
  // Evaluate the formula with current property values
  const previewValue = React.useMemo(() => {
    try {
      return FormulaEngine.evaluateText(formula, properties, context);
    } catch (error) {
      return 'Preview will appear as you fill properties...';
    }
  }, [formula, properties, context]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="flex items-center gap-2">
        {label}
        <Badge variant="secondary" className="text-xs">Dynamic Preview</Badge>
      </Label>
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-3">
          <div className="text-sm text-muted-foreground min-h-[20px]">
            {previewValue || 'Preview will appear as you fill properties...'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}