import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const PisC100xC170 = createC100C170Comparison({
  code: 'PIS_C100xC170',
  description: 'Validação de PIS entre C100 e C170',
  fieldC100: 'VL_PIS',
  fieldC170: 'VL_PIS',
  label: 'PIS',
  groupName: 'C100'
});
