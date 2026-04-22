/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from 'date-fns'
import type { TransactionWithNameRead } from '@/types/api'

interface ExportToExcelOptions {
  sheetName?: string
  includeIndex?: boolean
  autoFilter?: boolean
  freezeHeader?: boolean
}

const textEncoder = new TextEncoder()
const INVALID_XML_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g
const EXCEL_INVALID_SHEET_NAME = /[\\/?*[\]:]/g
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)

  for (let i = 0; i < 256; i += 1) {
    let current = i

    for (let bit = 0; bit < 8; bit += 1) {
      current = (current & 1) === 1 ? (0xedb88320 ^ (current >>> 1)) : (current >>> 1)
    }

    table[i] = current >>> 0
  }

  return table
})()

const escapeXml = (value: unknown) =>
  String(value ?? '')
    .replace(INVALID_XML_CHARACTERS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const sanitizeSheetName = (value: string) => {
  const cleaned = value
    .replace(EXCEL_INVALID_SHEET_NAME, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (cleaned || 'Sheet1').slice(0, 31)
}

const encodeXml = (xml: string) => textEncoder.encode(xml)

const concatUint8Arrays = (parts: Uint8Array[]) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  parts.forEach((part) => {
    result.set(part, offset)
    offset += part.length
  })

  return result
}

const uint16LE = (value: number) => {
  const bytes = new Uint8Array(2)
  bytes[0] = value & 0xff
  bytes[1] = (value >>> 8) & 0xff
  return bytes
}

const uint32LE = (value: number) => {
  const bytes = new Uint8Array(4)
  bytes[0] = value & 0xff
  bytes[1] = (value >>> 8) & 0xff
  bytes[2] = (value >>> 16) & 0xff
  bytes[3] = (value >>> 24) & 0xff
  return bytes
}

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff

  for (let i = 0; i < data.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

const createStoredZip = (files: Array<{ name: string; data: Uint8Array }>) => {
  const localParts: Uint8Array[] = []
  const centralDirectoryParts: Uint8Array[] = []
  let offset = 0

  files.forEach((file) => {
    const fileName = textEncoder.encode(file.name)
    const fileData = file.data
    const checksum = crc32(fileData)

    const localHeader = concatUint8Arrays([
      uint32LE(0x04034b50),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(checksum),
      uint32LE(fileData.length),
      uint32LE(fileData.length),
      uint16LE(fileName.length),
      uint16LE(0),
      fileName,
    ])

    localParts.push(localHeader, fileData)

    const centralDirectoryHeader = concatUint8Arrays([
      uint32LE(0x02014b50),
      uint16LE(20),
      uint16LE(20),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(checksum),
      uint32LE(fileData.length),
      uint32LE(fileData.length),
      uint16LE(fileName.length),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint16LE(0),
      uint32LE(0),
      uint32LE(offset),
      fileName,
    ])

    centralDirectoryParts.push(centralDirectoryHeader)
    offset += localHeader.length + fileData.length
  })

  const centralDirectory = concatUint8Arrays(centralDirectoryParts)
  const localContent = concatUint8Arrays(localParts)

  const endOfCentralDirectory = concatUint8Arrays([
    uint32LE(0x06054b50),
    uint16LE(0),
    uint16LE(0),
    uint16LE(files.length),
    uint16LE(files.length),
    uint32LE(centralDirectory.length),
    uint32LE(localContent.length),
    uint16LE(0),
  ])

  return concatUint8Arrays([localContent, centralDirectory, endOfCentralDirectory])
}

const getExcelColumnName = (columnIndex: number) => {
  let index = columnIndex
  let result = ''

  while (index > 0) {
    const remainder = (index - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    index = Math.floor((index - 1) / 26)
  }

  return result
}

const buildCell = (
  rowIndex: number,
  columnIndex: number,
  value: unknown,
  styleId = 0,
) => {
  const cellReference = `${getExcelColumnName(columnIndex)}${rowIndex}`
  const style = ` s="${styleId}"`

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${cellReference}"${style}><v>${value}</v></c>`
  }

  return `<c r="${cellReference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

const getColumnWidth = (header: string, values: unknown[]) => {
  const contentLengths = values.map((value) => String(value ?? '').length)
  const longest = Math.max(header.length, ...contentLengths, 6)

  return Math.min(40, Math.max(10, longest + 2))
}

const buildWorksheetXml = (
  headers: string[],
  rows: Array<Record<string, unknown>>,
  options: Required<ExportToExcelOptions>,
) => {
  const rowCount = rows.length + 1
  const columnCount = headers.length
  const lastColumn = getExcelColumnName(columnCount)
  const dimension = `A1:${lastColumn}${rowCount}`
  const autoFilter = options.autoFilter
    ? `<autoFilter ref="A1:${lastColumn}${rowCount}"/>`
    : ''
  const pane = options.freezeHeader
    ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
    : ''

  const columnDefinitions = headers
    .map((header, index) => {
      const values = rows.map((row) => row[header])
      return `<col min="${index + 1}" max="${index + 1}" width="${getColumnWidth(header, values)}" customWidth="1"/>`
    })
    .join('')

  const headerRow = `<row r="1">${headers
    .map((header, index) => buildCell(1, index + 1, header, 1))
    .join('')}</row>`

  const dataRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 2}">${headers
          .map((header, columnIndex) =>
            buildCell(rowIndex + 2, columnIndex + 1, row[header]),
          )
          .join('')}</row>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      ${pane}
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columnDefinitions}</cols>
  <sheetData>${headerRow}${dataRows}</sheetData>
  ${autoFilter}
</worksheet>`
}

const buildWorkbookXml = (sheetName: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`

const workbookRelationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

const packageRelationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <color rgb="FFFFFFFF"/>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FF1F4E78"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/>
      <right/>
      <top/>
      <bottom/>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`

const buildContentTypesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

const buildCorePropertiesXml = () => {
  const timestamp = new Date().toISOString()

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Bunyodkor CIMS</dc:creator>
  <cp:lastModifiedBy>Bunyodkor CIMS</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`
}

const appPropertiesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
</Properties>`

const buildExcelWorkbookBlob = (
  data: any[],
  filename: string,
  options: Required<ExportToExcelOptions>,
) => {
  const headers = Object.keys(data[0])
  const exportedHeaders = options.includeIndex ? ['No', ...headers] : headers
  const exportedRows = data.map((row, index) => {
    const nextRow: Record<string, unknown> = {}

    if (options.includeIndex) {
      nextRow.No = index + 1
    }

    headers.forEach((header) => {
      nextRow[header] = row[header]
    })

    return nextRow
  })

  const sheetName = sanitizeSheetName(options.sheetName || filename)
  const files = [
    { name: '[Content_Types].xml', data: encodeXml(buildContentTypesXml()) },
    { name: '_rels/.rels', data: encodeXml(packageRelationshipsXml) },
    { name: 'docProps/app.xml', data: encodeXml(appPropertiesXml) },
    { name: 'docProps/core.xml', data: encodeXml(buildCorePropertiesXml()) },
    { name: 'xl/workbook.xml', data: encodeXml(buildWorkbookXml(sheetName)) },
    { name: 'xl/_rels/workbook.xml.rels', data: encodeXml(workbookRelationshipsXml) },
    { name: 'xl/styles.xml', data: encodeXml(stylesXml) },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: encodeXml(buildWorksheetXml(exportedHeaders, exportedRows, options)),
    },
  ]

  return new Blob([createStoredZip(files)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Download data as CSV file
 */
 
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Get headers from first object keys
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Force Excel to use comma as separator regardless of OS locale
    'sep=,',
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in values
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\r\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Download data as JSON file
 */
 
export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2)

  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Download data as a real Excel workbook with header filters.
 */
export const exportToExcel = (
  data: any[],
  filename: string,
  options: ExportToExcelOptions = {},
) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const blob = buildExcelWorkbookBlob(data, filename, {
    sheetName: options.sheetName || filename,
    includeIndex: options.includeIndex ?? true,
    autoFilter: options.autoFilter ?? true,
    freezeHeader: options.freezeHeader ?? true,
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Transform data for export by flattening nested objects
 */
export const flattenDataForExport = (data: any[]): any[] => {
  return data.map(item => {
    const flattened: any = {}

    Object.entries(item).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        flattened[key] = ''
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Flatten nested objects
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          flattened[`${key}_${nestedKey}`] = nestedValue
        })
      } else if (value instanceof Date) {
        flattened[key] = format(value, 'yyyy-MM-dd HH:mm:ss')
      } else if (Array.isArray(value)) {
        flattened[key] = value.join(', ')
      } else {
        flattened[key] = value
      }
    })

    return flattened
  })
}

/**
 * Export transactions data with all fields
 */
export const exportTransactions = (transactions: TransactionWithNameRead[]) => {
  const exportData = transactions.map(tx => ({
    ID: tx.id,
    'External ID': tx.external_id || '',
    Source: tx.source || '',
    Amount: tx.amount || '',
    Status: tx.status || '',
    'Student ID': tx.student_id || '',
    'Student Name': tx.student_full_name || 'Unassigned',
    'Contract ID': tx.contract_id || '',
    'Paid At': tx.paid_at ? format(new Date(tx.paid_at), 'yyyy-MM-dd HH:mm:ss') : '',
    Description: tx.description || '',
    'Created At': tx.created_at ? format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated At': tx.updated_at ? format(new Date(tx.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'transactions')
}

/**
 * Export students data with all fields
 */
export const exportStudents = (students: any[]) => {
  const exportData = students.map(student => ({
    ID: student.id,
    'First Name': student.first_name || '',
    'Last Name': student.last_name || '',
    'Phone': student.phone || '',
    'Email': student.email || '',
    'Date of Birth': student.date_of_birth ? format(new Date(student.date_of_birth), 'yyyy-MM-dd') : '',
    'Address': student.address || '',
    'Status': student.status || '',
    'Group ID': student.group_id || '',
    'Created At': student.created_at ? format(new Date(student.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated At': student.updated_at ? format(new Date(student.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'students')
}

/**
 * Export groups data with all fields
 */
export const exportGroups = (groups: any[]) => {
  const exportData = groups.map(group => ({
    ID: group.id,
    Name: group.name || '',
    'Coach ID': group.coach_id || '',
    'Schedule Days': group.schedule_days || '',
    'Schedule Time': group.schedule_time || '',
    'Start Date': group.start_date ? format(new Date(group.start_date), 'yyyy-MM-dd') : '',
    'End Date': group.end_date ? format(new Date(group.end_date), 'yyyy-MM-dd') : '',
    Status: group.status || '',
    'Created At': group.created_at ? format(new Date(group.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated At': group.updated_at ? format(new Date(group.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'groups')
}

/**
 * Export contracts data with all fields
 */
export const exportContracts = (contracts: any[]) => {
  const exportData = contracts.map(contract => ({
    ID: contract.id,
    'Contract Number': contract.contract_number || '',
    'Student ID': contract.student_id || '',
    'Start Date': contract.start_date ? format(new Date(contract.start_date), 'yyyy-MM-dd') : '',
    'End Date': contract.end_date ? format(new Date(contract.end_date), 'yyyy-MM-dd') : '',
    'Monthly Fee': contract.monthly_fee || '',
    Status: contract.status || '',
    'Created At': contract.created_at ? format(new Date(contract.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated At': contract.updated_at ? format(new Date(contract.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'contracts')
}

/**
 * Export users data with all fields
 */
export const exportUsers = (users: any[]) => {
  const exportData = users.map(user => ({
    ID: user.id,
    'Full Name': user.full_name || '',
    Email: user.email || '',
    'Phone Number': user.phone_number || '',
    'Is Super Admin': user.is_super_admin ? 'Yes' : 'No',
    'Is Active': user.is_active ? 'Yes' : 'No',
    'Role ID': user.role_id || '',
    'Created At': user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated At': user.updated_at ? format(new Date(user.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'users')
}

/**
 * Export roles data with all fields
 */
export const exportRoles = (roles: any[]) => {
  const exportData = roles.map(role => ({
    ID: role.id,
    Name: role.name || '',
    Description: role.description || '',
    'Permissions Count': role.permissions?.length || 0,
    'Created At': role.created_at ? format(new Date(role.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    'Updated At': role.updated_at ? format(new Date(role.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'roles')
}

/**
 * Export attendance data with all fields
 */
export const exportAttendance = (attendance: any[]) => {
  const exportData = attendance.map(record => ({
    ID: record.id,
    'Student ID': record.student_id || '',
    'Group ID': record.group_id || '',
    'Session ID': record.session_id || '',
    Date: record.date ? format(new Date(record.date), 'yyyy-MM-dd') : '',
    Status: record.status || '',
    'Marked By': record.marked_by || '',
    'Created At': record.created_at ? format(new Date(record.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
  }))

  exportToExcel(exportData, 'attendance')
}

/**
 * Export reports data
 */
export const exportReport = (data: any, reportType: string) => {
  if (Array.isArray(data)) {
    exportToExcel(flattenDataForExport(data), reportType)
  } else {
    exportToJSON(data, reportType)
  }
}

/**
 * Download a Blob as a file
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
