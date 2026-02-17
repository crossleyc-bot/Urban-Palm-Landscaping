import { useState, useCallback } from 'react';

const validators = {
  required: (v) => (!v || !v.toString().trim()) ? 'This field is required' : '',
  email: (v) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Please enter a valid email address' : '',
  phone: (v) => v && !/^[\d\s()+-]{7,}$/.test(v) ? 'Please enter a valid phone number' : '',
  minLength: (min) => (v) => v && v.length < min ? `Must be at least ${min} characters` : '',
  futureDate: (v) => {
    if (!v) return '';
    const selected = new Date(v);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selected < today ? 'Date must be today or in the future' : '';
  },
};

export default function useFormValidation(rules) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((field, value) => {
    const fieldRules = rules[field];
    if (!fieldRules) return '';
    for (const rule of fieldRules) {
      const fn = typeof rule === 'string' ? validators[rule] : rule;
      const err = fn(value);
      if (err) return err;
    }
    return '';
  }, [rules]);

  const handleBlur = useCallback((field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
  }, [validate]);

  const validateAll = useCallback((values) => {
    const newErrors = {};
    let valid = true;
    for (const field of Object.keys(rules)) {
      const err = validate(field, values[field]);
      newErrors[field] = err;
      if (err) valid = false;
    }
    setErrors(newErrors);
    setTouched(Object.keys(rules).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return valid;
  }, [rules, validate]);

  const getFieldProps = useCallback((field) => ({
    onBlur: (e) => handleBlur(field, e.target.value),
    className: touched[field] && errors[field] ? 'field-error' : '',
  }), [handleBlur, touched, errors]);

  const FieldError = useCallback(({ field }) => {
    if (!touched[field] || !errors[field]) return null;
    return <span className="field-error-message">{errors[field]}</span>;
  }, [touched, errors]);

  return { errors, touched, handleBlur, validateAll, getFieldProps, FieldError };
}

export { validators };
