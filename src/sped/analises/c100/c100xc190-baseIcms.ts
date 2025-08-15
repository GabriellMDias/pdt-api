import { createC100C190Comparison } from '../../utils/createC100C190Comparison';

export const BaseICMSC100xC190 = createC100C190Comparison({
  code: 'BaseICMSC100xC190',
  description: 'Validação de Base de Cálculo ICMS entre C100 e C190',
  fieldC100: 'VL_BC_ICMS',
  fieldC190: 'VL_BC_ICMS',
  label: 'ICMS',
  groupName: 'C100'
});