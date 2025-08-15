import { BaseICMSC100xC170 } from './analises/c100/c100xc170-baseIcms'
import { ICMSC100xC170 } from './analises/c100/c100xc170-icms'
import { ValorMercC100xC170 } from './analises/c100/c100xc170-valorMerc'
import { BaseICMSSTC100xC170 } from './analises/c100/c100xc170-baseIcmsSt'
import { DescC100xC170 } from './analises/c100/c100xc170-desc'
import { ICMSSTC100xC170 } from './analises/c100/c100xc170-icmsSt'
import { IPIC100xC170 } from './analises/c100/c100xc170-ipi'
import { PisC100xC170 } from './analises/c100/c100xc170-pis';
import { CofinsC100xC170 } from './analises/c100/c100xc170-cofins';
import { ICMSC100xC190 } from './analises/c100/c100xc190-icms'
import { ValorDocC100xC190 } from './analises/c100/c100xc190-valorDoc'
import { Cfop1556TipoItem7 } from './analises/c170/cfop1556-tipoItem7'
import { Cfop1556ComCredICMS } from './analises/c170/cfop1556-comCredIcms'
import { Cfop1556CSTx90 } from './analises/c170/cfop1556-CSTx90'
import { Cfop1551TipoItem8 } from './analises/c170/cfop1551-tipoItem8'
import { Cfop1551ComCredICMS } from './analises/c170/cfop1551-comCredIcms'
import { Cfop1551CSTx90 } from './analises/c170/cfop1551-CSTx90'
import { Cfop1406CSTx60 } from './analises/c170/cfop1406-CSTx60'
import { Cfop1407CSTx60 } from './analises/c170/cfop1407-CSTx60'
import { CfopMPTipoItem0102 } from './analises/c170/cfopMP-tipoItem0102'
import { CfopMPRevCSTx02090 } from './analises/c170/cfopMPRev-CSTx02090'
import { CfopRevSubTribCSTx60 } from './analises/c170/cfopRevSubTrib-CSTx60'
import { CfopMPSubTribCSTx60 } from './analises/c170/cfopMPSubTrib-CSTx60'
import { CfopBonifComCredICMSCST0220 } from './analises/c170/cfopBonif-comCredIcms-CST0220'
import { CfopBonifSemCredICMSCST9060 } from './analises/c170/cfopBonif-semCredIcms-CST9060'

export const AnalisesDisponiveis = [ValorDocC100xC190, ICMSC100xC190, BaseICMSC100xC170, ICMSC100xC170, ValorMercC100xC170, BaseICMSSTC100xC170, 
    DescC100xC170, ICMSSTC100xC170, IPIC100xC170, PisC100xC170, CofinsC100xC170, Cfop1556TipoItem7, Cfop1556ComCredICMS, Cfop1556CSTx90,
    Cfop1551TipoItem8, Cfop1551ComCredICMS, Cfop1551CSTx90, Cfop1406CSTx60, Cfop1407CSTx60, CfopMPTipoItem0102, CfopMPRevCSTx02090, CfopRevSubTribCSTx60,
    CfopMPSubTribCSTx60, CfopBonifComCredICMSCST0220, CfopBonifSemCredICMSCST9060
];
