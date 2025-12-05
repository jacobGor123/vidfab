/**
 * Table Slot Type Definitions
 * Extended table interface for slot-based rendering
 */

import { TableColumn } from '../blocks/table';

export interface Slot {
  title?: string;             // Slot title
  description?: string;       // Slot description
}

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export interface Table extends Slot {
  columns?: TableColumn[];    // Table column definitions
  data?: any[];               // Table data
  empty_message?: string;     // Message to display when table is empty
  pagination?: PaginationConfig; // Pagination configuration
}
