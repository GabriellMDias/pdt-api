import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const BaseICMSC100xC170 = createC100C170Comparison({
  code: 'BaseICMS_C100xC170',
  description: 'Validação de Base de Cálculo ICMS entre C100 e C170',
  fieldC100: 'VL_BC_ICMS',
  fieldC170: 'VL_BC_ICMS',
  label: 'Base ICMS',
  groupName: 'C100'
});
