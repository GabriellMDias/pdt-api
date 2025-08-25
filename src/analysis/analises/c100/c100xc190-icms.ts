import { createC100C190Comparison } from '../../utils/createC100C190Comparison';

export const ICMSC100xC190 = createC100C190Comparison({
  code: 'ICMS_C100xC190',
  description: 'Validação de ICMS entre C100 e C190',
  fieldC100: 'VL_ICMS',
  fieldC190: 'VL_ICMS',
  label: 'ICMS',
  groupName: 'C100'
});