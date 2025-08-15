import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const ICMSC100xC170 = createC100C170Comparison({
  code: 'ICMS_C100xC170',
  description: 'Validação de ICMS entre C100 e C170',
  fieldC100: 'VL_ICMS',
  fieldC170: 'VL_ICMS',
  label: 'ICMS',
  groupName: 'C100'
});
