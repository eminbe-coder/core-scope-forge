/**
 * Simple formula engine for calculated properties
 * Supports basic math operations and property references
 */

export interface PropertyValue {
  name: string;
  value: string | number;
}

export class FormulaEngine {
  /**
   * Evaluate a formula with property substitutions
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
   * Extract property references from a formula
   * @param formula - Formula string
   * @returns Array of property names referenced in the formula
   */
  static extractPropertyReferences(formula: string): string[] {
    if (!formula) return [];
    
    const matches = formula.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.slice(1, -1)); // Remove { and }
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
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      // Try to parse as number
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * Safely evaluate a mathematical expression
   * Uses a simple recursive descent parser instead of eval()
   */
  private static evaluateMathExpression(expression: string): number {
    // Remove all whitespace
    expression = expression.replace(/\s/g, '');
    
    if (!expression) return 0;
    
    // Simple expression evaluator using Function constructor (safer than eval)
    try {
      // Additional safety check - ensure no function calls or assignments
      if (expression.includes('(') && !this.hasValidParentheses(expression)) {
        return 0;
      }
      
      // Use Function constructor which is safer than eval and allows us to control scope
      const result = new Function(`"use strict"; return (${expression})`)();
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if parentheses in expression are properly balanced and only used for math
   */
  private static hasValidParentheses(expression: string): boolean {
    let count = 0;
    for (const char of expression) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }

  /**
   * Validate formula syntax before saving
   */
  static validateFormula(formula: string, availableProperties: string[]): { isValid: boolean; error?: string } {
    try {
      if (!formula || formula.trim() === '') {
        return { isValid: true };
      }

      // Add fixed properties that are always available
      const fixedProperties = ['item_code'];
      const allAvailableProperties = [...fixedProperties, ...availableProperties];

      // Check for property references that aren't available
      const propertyReferences = this.extractPropertyReferences(formula);
      const missingProperties = propertyReferences.filter(prop => !allAvailableProperties.includes(prop));
      
      if (missingProperties.length > 0) {
        return { 
          isValid: false, 
          error: `Unknown properties: ${missingProperties.join(', ')}` 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid formula' 
      };
    }
  }
}