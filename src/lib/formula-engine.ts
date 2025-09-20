/**
 * Enhanced formula engine for calculated properties with context-aware resolution
 * Supports basic math operations and property references with different contexts
 */

export interface PropertyValue {
  name: string;
  value: string | number;
  options?: Array<{ code: string; label_en: string; label_ar?: string; }>;
}

export type FormulaContext = 'sku' | 'description_en' | 'description_ar' | 'calculation';

export class FormulaEngine {
  /**
   * Evaluate a formula with property substitutions for numeric calculations
   * @param formula - Formula string with {property_name} references
   * @param properties - Array of property values to substitute
   * @returns Calculated result or 0 if error
   */
  static evaluate(formula: string, properties: PropertyValue[]): number {
    try {
      if (!formula || typeof formula !== 'string') {
        return 0;
      }

      // Replace property references {property_name} with actual values
      let processedFormula = formula;
      properties.forEach(prop => {
        const regex = new RegExp(`\\{${prop.name}\\}`, 'g');
        const numValue = this.toNumber(prop.value);
        processedFormula = processedFormula.replace(regex, numValue.toString());
      });

      // Check if all property references were replaced
      if (processedFormula.includes('{') && processedFormula.includes('}')) {
        // Some property references weren't found
        return 0;
      }

      // Validate that the formula only contains allowed characters
      if (!this.isValidFormula(processedFormula)) {
        return 0;
      }

      // Evaluate the mathematical expression
      const result = this.evaluateMathExpression(processedFormula);
      return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.warn('Formula evaluation error:', error);
      return 0;
    }
  }

  /**
   * Evaluate a text formula with context-aware property resolution
   * @param formula - Formula string with {property_name} references
   * @param properties - Array of property values to substitute
   * @param context - Context for property resolution (sku, description_en, description_ar, calculation)
   * @returns Processed text formula
   */
  static evaluateText(formula: string, properties: PropertyValue[], context: FormulaContext = 'description_en'): string {
    if (!formula || !properties) {
      return formula || '';
    }

    try {
      let processedFormula = formula;
      
      properties.forEach(prop => {
        // Handle different property reference syntaxes
        const baseRegex = new RegExp(`\\{${prop.name}\\}`, 'g');
        const codeRegex = new RegExp(`\\{${prop.name}\\.code\\}`, 'g');
        const labelEnRegex = new RegExp(`\\{${prop.name}\\.label_en\\}`, 'g');
        const labelArRegex = new RegExp(`\\{${prop.name}\\.label_ar\\}`, 'g');

        // Replace specific syntax first
        if (prop.options && Array.isArray(prop.options)) {
          const selectedOption = prop.options.find(opt => opt.code === prop.value || opt.label_en === prop.value);
          
          processedFormula = processedFormula.replace(codeRegex, selectedOption?.code || prop.value.toString());
          processedFormula = processedFormula.replace(labelEnRegex, selectedOption?.label_en || prop.value.toString());
          processedFormula = processedFormula.replace(labelArRegex, selectedOption?.label_ar || selectedOption?.label_en || prop.value.toString());
        } else {
          processedFormula = processedFormula.replace(codeRegex, prop.value.toString());
          processedFormula = processedFormula.replace(labelEnRegex, prop.value.toString());
          processedFormula = processedFormula.replace(labelArRegex, prop.value.toString());
        }

        // Handle base syntax based on context
        if (prop.options && Array.isArray(prop.options)) {
          const selectedOption = prop.options.find(opt => opt.code === prop.value || opt.label_en === prop.value);
          let contextValue = prop.value.toString();
          
          if (selectedOption) {
            switch (context) {
              case 'sku':
                contextValue = selectedOption.code;
                break;
              case 'description_en':
                contextValue = selectedOption.label_en;
                break;
              case 'description_ar':
                contextValue = selectedOption.label_ar || selectedOption.label_en;
                break;
              default:
                contextValue = selectedOption.label_en;
            }
          }
          
          processedFormula = processedFormula.replace(baseRegex, contextValue);
        } else {
          processedFormula = processedFormula.replace(baseRegex, prop.value.toString());
        }
      });

      return processedFormula;
    } catch (error) {
      console.error('Error evaluating text formula:', error);
      return formula;
    }
  }

  /**
   * Extract property references from a formula
   * @param formula - Formula string
   * @returns Array of property names referenced in the formula
   */
  static extractPropertyReferences(formula: string): string[] {
    if (!formula) return [];
    
    const matches = formula.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.slice(1, -1).split('.')[0]); // Remove { } and get base property name
  }

  /**
   * Validate that a processed formula only contains safe mathematical expressions
   */
  private static isValidFormula(formula: string): boolean {
    // Only allow numbers, operators, parentheses, and whitespace
    const validPattern = /^[\d\s+\-*/().]+$/;
    return validPattern.test(formula);
  }

  /**
   * Convert a value to number, handling various input types
   */
  private static toNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Safely evaluate a mathematical expression
   */
  private static evaluateMathExpression(expression: string): number {
    try {
      // Use Function constructor for safe evaluation of basic math expressions
      // This is safer than eval() but still requires validated input
      const result = new Function('return ' + expression)();
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn('Math expression evaluation error:', error);
      return 0;
    }
  }

  /**
   * Validate formula syntax and check for valid property references
   * @param formula - Formula to validate
   * @param availableProperties - List of available property names
   * @returns Validation result with error message if invalid
   */
  static validateFormula(formula: string, availableProperties: string[]): { isValid: boolean; error?: string } {
    if (!formula) {
      return { isValid: true };
    }

    try {
      // Extract all property references from the formula
      const references = this.extractPropertyReferences(formula);
      
      // Check if all referenced properties are available
      const invalidReferences = references.filter(ref => !availableProperties.includes(ref));
      
      if (invalidReferences.length > 0) {
        return {
          isValid: false,
          error: `Unknown properties: ${invalidReferences.join(', ')}`
        };
      }

      // Try to evaluate with dummy values to check syntax
      const dummyProperties: PropertyValue[] = availableProperties.map(name => ({
        name,
        value: 1
      }));

      // Replace property references with numbers and validate math syntax
      let testFormula = formula;
      dummyProperties.forEach(prop => {
        const regex = new RegExp(`\\{${prop.name}(\\.[^}]+)?\\}`, 'g');
        testFormula = testFormula.replace(regex, '1');
      });

      // Check if there are still unresolved references
      if (testFormula.includes('{') && testFormula.includes('}')) {
        return {
          isValid: false,
          error: 'Some property references could not be resolved'
        };
      }

      // For numeric formulas, validate math syntax
      if (this.isValidFormula(testFormula)) {
        try {
          this.evaluateMathExpression(testFormula);
        } catch (error) {
          return {
            isValid: false,
            error: 'Invalid mathematical expression'
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Formula validation failed'
      };
    }
  }
}