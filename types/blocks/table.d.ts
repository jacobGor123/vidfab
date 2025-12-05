/**
 * Table Block Type Definitions
 * Basic building blocks for table components
 */

export interface TableColumn {
  name?: string;              // Field name in the data object
  title?: string;             // Column header display text
  type?: string;              // Column type (e.g., 'copy', 'link', 'badge')
  options?: any[];            // Options for select/dropdown columns
  className?: string;         // Custom CSS classes for the column
  callback?: (item: any) => any;  // Custom render function for the cell
}

export interface Table {
  columns: TableColumn[];     // Array of column definitions
  data: any[];                // Array of data rows
}
