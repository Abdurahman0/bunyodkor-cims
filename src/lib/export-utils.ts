/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from 'date-fns'
import type { TransactionWithNameRead } from '@/types/api'

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
 * Download data as Excel-compatible file (CSV with UTF-8 BOM)
 */
export const exportToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const headers = Object.keys(data[0])
  const allHeaders = ['No', ...headers]
  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const headerHtml = allHeaders
    .map(
      (header) =>
        `<th style="background:#1f4e78;color:#fff;font-weight:700;border:1px solid #d9d9d9;padding:8px;text-align:left;">${escapeHtml(header)}</th>`,
    )
    .join('')

  const rowsHtml = data
    .map((row, index) => {
      const cells = [index + 1, ...headers.map((h) => row[h])]
        .map((value) => {
          const isNumber = typeof value === 'number'
          const align = isNumber ? 'right' : 'left'
          return `<td style="border:1px solid #e5e7eb;padding:6px;text-align:${align};">${escapeHtml(value)}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 12px; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`

  const blob = new Blob(['\uFEFF', htmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xls`)
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
