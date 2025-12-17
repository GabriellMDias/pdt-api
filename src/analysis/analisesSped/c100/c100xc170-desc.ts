import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const DescC100xC170 = createC100C170Comparison({
  code: 'DescC100xC170',
  description: 'Validação do valor de desconto entre C100 e C170',
  fieldC100: 'VL_DESC',
  fieldC170: 'VL_DESC',
  label: 'Desconto',
  groupName: 'C100'
});
