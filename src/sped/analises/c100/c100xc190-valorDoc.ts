import { createC100C190Comparison } from '../../utils/createC100C190Comparison';

export const ValorDocC100xC190 = createC100C190Comparison({
  code: 'BaseICMSC100xC190',
  description: 'Validação Valor do doxumento x Valor Operação entre C100 e C190',
  fieldC100: 'VL_DOC',
  fieldC190: 'VL_OPR',
  label: 'Valor',
  groupName: 'C100'
});