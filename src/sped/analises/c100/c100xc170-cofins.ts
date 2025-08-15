import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const CofinsC100xC170 = createC100C170Comparison({
  code: 'COFINS_C100xC170',
  description: 'Validação de COFINS entre C100 e C170',
  fieldC100: 'VL_COFINS',
  fieldC170: 'VL_COFINS',
  label: 'COFINS',
  groupName: 'C100'
});
