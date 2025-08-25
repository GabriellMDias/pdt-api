import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const BaseICMSSTC100xC170 = createC100C170Comparison({
  code: 'BaseICMSST_C100xC170',
  description: 'Validação de Base de Cálculo ICMS ST entre C100 e C170',
  fieldC100: 'VL_BC_ICMS_ST',
  fieldC170: 'VL_BC_ICMS_ST',
  label: 'Base ICMS ST',
  groupName: 'C100'
});
