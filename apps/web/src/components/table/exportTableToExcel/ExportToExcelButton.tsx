import { exportTableToExcel } from './exportTableToExcel'
import DefaultButton from '../../inputs/DefaultButton'
import excelImage from './excel.png'

export const ExportToExcelButton = ({
  tableId,
  fileName,
  className = '',
}: {
  tableId: string
  fileName: string
  className?: string
}) => {
  return (
    <DefaultButton
      onClick={() => exportTableToExcel(tableId, fileName)}
      className={className}
      title="Exportar para Excel"
    >
        <img src={excelImage} alt="Export xls" className="h-5 w-5"/>
    </DefaultButton>
  )
}
