// src/lib/utils/validation.ts
export type Validator = (value: any) => string | true;

export const validators = {
  required: (value: any): string | true => 
    (value !== null && value !== undefined && value !== '') || 'This field is required',
    
  email: (value: string): string | true => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Invalid email address',
    
  phone: (value: string): string | true => {
    const cleaned = value.replace(/\D/g, '');
    return (cleaned.length >= 10 && cleaned.length <= 15) || 'Invalid phone number';
  },
  
  minLength: (min: number) => (value: string): string | true =>
    value.length >= min || `Must be at least ${min} characters`,
    
  maxLength: (max: number) => (value: string): string | true =>
    value.length <= max || `Must be no more than ${max} characters`,
    
  pattern: (regex: RegExp, message: string) => (value: string): string | true =>
    regex.test(value) || message,
    
  number: (value: any): string | true =>
    !isNaN(Number(value)) || 'Must be a number',
    
  min: (min: number) => (value: number): string | true =>
    value >= min || `Must be at least ${min}`,
    
  max: (max: number) => (value: number): string | true =>
    value <= max || `Must be no more than ${max}`
};

// Composable form validation
export function createFormValidator<T extends Record<string, any>>(
  schema: Record<keyof T, Validator[]>
) {
  const errors = $state<Partial<Record<keyof T, string>>>({});
  const touched = $state<Partial<Record<keyof T, boolean>>>({});
  
  function validate(field: keyof T, value: any): boolean {
    const fieldValidators = schema[field] || [];
    
    for (const validator of fieldValidators) {
      const result = validator(value);
      if (result !== true) {
        errors[field] = result;
        return false;
      }
    }
    
    delete errors[field];
    return true;
  }
  
  function validateAll(values: T): boolean {
    let isValid = true;
    
    for (const field in schema) {
      if (!validate(field, values[field])) {
        isValid = false;
      }
      touched[field] = true;
    }
    
    return isValid;
  }
  
  function touch(field: keyof T) {
    touched[field] = true;
  }
  
  function reset() {
    Object.keys(errors).forEach(key => delete errors[key as keyof T]);
    Object.keys(touched).forEach(key => delete touched[key as keyof T]);
  }
  
  return {
    errors: $derived(errors),
    touched: $derived(touched),
    validate,
    validateAll,
    touch,
    reset,
    isValid: $derived(Object.keys(errors).length === 0)
  };
}