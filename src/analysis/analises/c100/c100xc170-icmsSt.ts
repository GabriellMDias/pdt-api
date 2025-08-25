import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const ICMSSTC100xC170 = createC100C170Comparison({
  code: 'ICMSSTC100xC170',
  description: 'Validação do ICMS ST entre C100 e C170',
  fieldC100: 'VL_ICMS_ST',
  fieldC170: 'VL_ICMS_ST',
  label: 'ICMS ST',
  groupName: 'C100'
});
