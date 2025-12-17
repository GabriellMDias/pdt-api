import { createC100C170Comparison } from '../../utils/createC100C170Comparison';

export const ValorMercC100xC170 = createC100C170Comparison({
  code: 'ValorMerc_C100xC170',
  description: 'Validação do valor de mercadoria entre C100 e C170',
  fieldC100: 'VL_MERC',
  fieldC170: 'VL_ITEM',
  label: 'ValorMerc',
  groupName: 'C100'
});
